import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict, forbidden } from "./errors";
import type { Caller } from "./session";
import { readOrAdoptProfile } from "./profiles";
import { createOrder, fetchOrder, razorpayKeyId, type RzpPayment } from "./razorpay";
import { enqueueOp } from "./provisioning";
import { planCurrencyFor } from "@/lib/billing/model";
import {
  applyMonthlyGrant,
  applyTopup,
  applyUsage,
  initialLedger,
  ledgerFromDoc,
  packById,
  remaining,
  spentThisCycle,
  type CreditLedger,
  type TopupPackId,
} from "@/lib/billing/credits";
import { hasWorkspace } from "@/lib/account/state";
import { shipLog } from "./logship";

/**
 * Credits, server half. The ledger lives on `users/{uid}.credits`; every
 * mutation lands here, and every change to the target limit becomes an op
 * the VPS worker applies to the actual OpenRouter key.
 */

const USERS = "users";
/** One document per Razorpay payment: a redelivered webhook buys nothing twice. */
const PURCHASES = "credit_purchases";

const asLedger = (data: FirebaseFirestore.DocumentData | undefined): CreditLedger | null =>
  ledgerFromDoc(data?.credits);

export async function readLedger(uid: string): Promise<CreditLedger | null> {
  const snap = await adminDb().collection(USERS).doc(uid).get();
  return asLedger(snap.data());
}

/** First stamp of a self-serve workspace also opens its ledger. */
export function initialLedgerFields() {
  return { credits: initialLedger() };
}

/** POST /api/account/credits/topup — create the order Checkout will pay. */
export async function startTopup(caller: Caller, packId: unknown) {
  const pack = packById(packId);
  if (!pack) throw badRequest("bad-pack", "Pick one of the credit packs.");

  const profile = await readOrAdoptProfile(caller);
  if (!profile) throw badRequest("no-profile", "Make an account first.");
  if (!hasWorkspace(profile)) {
    throw forbidden("no-workspace", "Credits top up a live workspace. Subscribe first.");
  }

  const currency = planCurrencyFor(profile.country);
  const order = await createOrder(pack.price[currency], currency, {
    kind: "topup",
    uid: caller.uid,
    pack: pack.id,
    credit_usd: String(pack.creditUsd),
  });

  return {
    orderId: order.id,
    keyId: razorpayKeyId(),
    amountMinor: pack.price[currency],
    currency,
    display: pack.display[currency],
    creditUsd: pack.creditUsd,
  };
}

/**
 * A captured payment from the webhook. Only order-backed payments whose order
 * says `kind: topup` matter here; everything else is the subscription's
 * business. The order is re-fetched from Razorpay — notes from our own server
 * to our own server, never trusted off the wire.
 */
export async function applyTopupPayment(payment: RzpPayment): Promise<"applied" | "ignored" | "duplicate"> {
  if (payment.status !== "captured" || !payment.order_id) return "ignored";
  const order = await fetchOrder(payment.order_id);
  if (order.notes?.kind !== "topup") return "ignored";

  const uid = order.notes.uid;
  const creditUsd = Number(order.notes.credit_usd);
  if (!uid || !Number.isFinite(creditUsd) || creditUsd <= 0) {
    console.error(`[credits] topup order ${order.id} has bad notes`, order.notes);
    return "ignored";
  }

  const db = adminDb();
  const purchaseRef = db.collection(PURCHASES).doc(payment.id);
  const userRef = db.collection(USERS).doc(uid);

  const outcome = await db.runTransaction(async (tx) => {
    const [seen, user] = await Promise.all([tx.get(purchaseRef), tx.get(userRef)]);
    if (seen.exists) return "duplicate" as const;
    if (!user.exists) return "ignored" as const;

    const ledger = asLedger(user.data()) ?? initialLedger();
    const next = applyTopup(ledger, creditUsd);
    tx.update(userRef, { credits: next, updatedAt: FieldValue.serverTimestamp() });
    tx.set(purchaseRef, {
      uid,
      orderId: order.id,
      creditUsd,
      amountMinor: payment.amount,
      currency: payment.currency,
      createdAt: FieldValue.serverTimestamp(),
    });
    enqueueOp(tx, {
      uid,
      email: user.data()!.email,
      username: user.data()!.workspace_username ?? "",
      op: "sync_limit", valueUsd: next.targetLimitUsd,
    });
    return "applied" as const;
  });

  if (outcome === "applied") {
    console.log(`[credits] topup +$${creditUsd} for ${uid}`);
    shipLog("billing", "top-up applied", { uid, usd: creditUsd, payment: payment.id });
  }
  return outcome;
}

/**
 * The monthly charge landed (called inside the billing webhook transaction):
 * settle the cycle, expire unspent included credit, re-grant, and queue the
 * limit change. Skipped for accounts with no ledger (pre-self-serve).
 */
export function applyMonthlyGrantInTransaction(
  tx: FirebaseFirestore.Transaction,
  userRef: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
): void {
  const ledger = asLedger(data);
  if (!ledger) return;
  const next = applyMonthlyGrant(ledger);
  tx.update(userRef, { credits: next });
  enqueueOp(tx, {
    uid: data.uid,
    email: data.email,
    username: data.workspace_username ?? "",
    op: "sync_limit", valueUsd: next.targetLimitUsd,
  });
}

/** The worker's usage push: [{email, usageUsd}], matched by email claim. */
export async function ingestUsage(items: { email: string; usageUsd: number }[]) {
  const db = adminDb();
  const now = new Date().toISOString();
  let applied = 0;
  for (const item of items.slice(0, 200)) {
    if (typeof item?.email !== "string" || !Number.isFinite(item?.usageUsd)) continue;
    const users = await db
      .collection(USERS)
      .where("email", "==", item.email.trim().toLowerCase())
      .limit(1)
      .get();
    const doc = users.docs[0];
    if (!doc) continue;
    const ledger = asLedger(doc.data());
    if (!ledger) continue;
    await doc.ref.update({ credits: applyUsage(ledger, item.usageUsd, now) });
    applied++;
  }
  return applied;
}

/** What /account/credits shows once a ledger exists. */
export function summarizeLedger(ledger: CreditLedger) {
  const rem = remaining(ledger);
  return {
    includedUsd: ledger.includedUsd ?? 20,
    remaining: { includedUsd: rem.includedUsd, topupUsd: rem.topupUsd, grantsUsd: rem.grantsUsd },
    grants: rem.grants.map((g) => ({ id: g.id, usd: g.usd, expiresAt: g.expiresAt, note: g.note ?? null })),
    spentThisCycleUsd: spentThisCycle(ledger),
    topupBalanceUsd: ledger.topupBalanceUsd,
    usageSyncedAt: ledger.usageSyncedAt,
  };
}

export type TopupStart = Awaited<ReturnType<typeof startTopup>>;
export type { TopupPackId };
