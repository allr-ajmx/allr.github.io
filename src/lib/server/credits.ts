import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, forbidden } from "./errors";
import type { Caller } from "./session";
import { readOrAdoptProfile } from "./profiles";
import { capturePayment, createOrder, fetchOrder, razorpayKeyId, refundPayment, type RzpPayment } from "./razorpay";
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
  targetOf,
  type CreditLedger,
  type TopupPackId,
} from "@/lib/billing/credits";
import { hasWorkspace } from "@/lib/account/state";
import { shipLog } from "./logship";
import { recordIgnoredWebhook } from "./billing";
import { triageTopup } from "@/lib/billing/triage";

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
/** A new ledger; a promotional month opens with its own (smaller) credit. */
export function initialLedgerFields(includedLeftUsd?: number) {
  const l = initialLedger();
  if (includedLeftUsd === undefined) return { credits: l };
  const next = { ...l, includedLeftUsd };
  return { credits: { ...next, targetLimitUsd: targetOf(next) } };
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
    // The account can move to a new login before the payment lands.
    email: caller.email,
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

export type TopupOutcome = "applied" | "ignored" | "duplicate" | "refunded" | "refund-failed";

const emailKey = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const workspaceLive = (d: FirebaseFirestore.DocumentData | undefined) =>
  Boolean(
    String(d?.workspace_username ?? "").trim() &&
      String(d?.workspace_email ?? "").trim() &&
      String(d?.workspace_address ?? "").trim(),
  );

/** The account an order belongs to: by uid, else (it moved logins) by email. */
async function accountFor(uid: string, email: string | undefined) {
  const db = adminDb();
  const byUid = db.collection(USERS).doc(uid);
  if ((await byUid.get()).exists) return byUid;
  if (!email) return null;
  const claim = await db.collection("user_emails").doc(emailKey(email)).get();
  const moved = claim.data()?.uid as string | undefined;
  return moved ? db.collection(USERS).doc(moved) : null;
}

/**
 * A credit-pack payment, from the webhook (payment.authorized / .captured)
 * or the reconciler — idempotent by payment id either way.
 *
 * - Not one of our top-up orders: ignored (recorded when money is involved).
 * - Authorized but not captured: captured here, then applied.
 * - The account has a live workspace: the pack is credited.
 * - Otherwise (no account, no workspace): refunded automatically — a pack
 *   tops up a workspace, and money we cannot apply goes back.
 */
export async function applyTopupPayment(
  payment: RzpPayment,
  eventId = "",
  { source = "webhook" }: { source?: "webhook" | "reconcile" } = {},
): Promise<TopupOutcome> {
  if (!payment.order_id || payment.invoice_id) return "ignored";
  if (payment.status !== "captured" && payment.status !== "authorized") return "ignored";
  const order = await fetchOrder(payment.order_id);
  const triage = triageTopup(order);
  const ids = { paymentId: payment.id, orderId: order.id };
  if (!triage.act) {
    if (triage.record) {
      await recordIgnoredWebhook(eventId || `payment:${payment.id}`, "payment.captured", triage.reason,
        { ...ids, uid: typeof order.notes?.uid === "string" ? order.notes.uid : null });
    }
    return "ignored";
  }

  const db = adminDb();
  const purchaseRef = db.collection(PURCHASES).doc(payment.id);
  if ((await purchaseRef.get()).exists) return "duplicate";

  if (payment.status === "authorized") {
    await capturePayment(payment.id, payment.amount, payment.currency);
    shipLog("billing", "top-up payment captured", { payment: payment.id });
  }

  const notesUid = String(order.notes!.uid);
  const notesEmail = typeof order.notes?.email === "string" ? order.notes.email : undefined;
  const creditUsd = Number(order.notes!.credit_usd);
  const userRef = await accountFor(notesUid, notesEmail);

  const outcome = await db.runTransaction(async (tx) => {
    const [seen, user] = await Promise.all([
      tx.get(purchaseRef),
      userRef ? tx.get(userRef) : Promise.resolve(null),
    ]);
    if (seen.exists) return { kind: "duplicate" as const };
    const base = {
      uid: userRef?.id ?? notesUid,
      orderId: order.id,
      creditUsd,
      amountMinor: payment.amount,
      currency: payment.currency,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (!user?.exists || !workspaceLive(user.data())) {
      const reason = !user?.exists ? "no account for this order" : "no live workspace to top up";
      // Claimed before refunding, so a redelivery can never refund twice.
      tx.set(purchaseRef, { ...base, status: "refunding", reason });
      return { kind: "refund" as const, reason };
    }
    const d = user.data()!;
    const next = applyTopup(asLedger(d) ?? initialLedger(), creditUsd);
    tx.update(userRef!, { credits: next, updatedAt: FieldValue.serverTimestamp() });
    tx.set(purchaseRef, { ...base, status: "applied" });
    enqueueOp(tx, {
      uid: userRef!.id,
      email: d.email,
      username: d.workspace_username,
      op: "sync_limit",
      valueUsd: next.targetLimitUsd,
    });
    if (source === "reconcile") {
      tx.set(db.collection("billing_events").doc(`reconcile:${payment.id}`), {
        eventName: "payment.captured",
        uid: userRef!.id,
        paymentId: payment.id,
        orderId: order.id,
        outcome: "applied-by-reconcile",
        reason: `webhook missed — $${creditUsd.toFixed(2)} top-up applied from Razorpay`,
        flag: true,
        resolved: false,
        receivedAt: FieldValue.serverTimestamp(),
      });
    }
    return { kind: "applied" as const, uid: userRef!.id };
  });

  if (outcome.kind === "duplicate") return "duplicate";
  if (outcome.kind === "applied") {
    console.log(`[credits] topup +$${creditUsd} for ${outcome.uid} (${source})`);
    shipLog("billing", "top-up applied", { uid: outcome.uid, usd: creditUsd, payment: payment.id, source });
    return "applied";
  }

  // Money we can't apply goes back, automatically.
  try {
    const refund = await refundPayment(payment.id, `auto: ${outcome.reason}`);
    await purchaseRef.update({ status: "refunded", refundIds: [refund.id], refundedMinor: refund.amount });
    await db.collection("billing_events").doc(`autorefund:${payment.id}`).set({
      eventName: "payment.captured",
      uid: userRef?.id ?? notesUid,
      paymentId: payment.id,
      orderId: order.id,
      outcome: "refunded",
      reason: `top-up refunded automatically: ${outcome.reason}`,
      flag: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
    shipLog("billing", "top-up refunded automatically", { payment: payment.id, reason: outcome.reason }, "warn");
    return "refunded";
  } catch (e) {
    console.error(`[credits] auto-refund of ${payment.id} failed`, e);
    await purchaseRef.update({ status: "refund-failed" }).catch(() => {});
    await db.collection("billing_events").doc(`autorefund:${payment.id}`).set({
      eventName: "payment.captured",
      uid: userRef?.id ?? notesUid,
      paymentId: payment.id,
      orderId: order.id,
      outcome: "refund-failed",
      reason: `top-up couldn't be applied (${outcome.reason}) and the automatic refund failed — refund it in Razorpay`,
      flag: true,
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
    shipLog("billing", "top-up auto-refund FAILED", { payment: payment.id, error: String(e) }, "error");
    return "refund-failed";
  }
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
  // No workspace yet (paying again after a removal): there is no key to move.
  // Linking the new workspace queues the sync that settles this charge.
  if (!String(data.workspace_username ?? "").trim()) return;
  enqueueOp(tx, {
    uid: data.uid,
    email: data.email,
    username: data.workspace_username ?? "",
    op: "sync_limit", valueUsd: next.targetLimitUsd,
  });
}

/** The worker's usage push: [{email, usageUsd}], matched by email claim. */
export async function ingestUsage(items: { email: string; usageUsd: number; username?: string }[]) {
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
    // Usage belongs to one key, i.e. one workspace: never let another
    // workspace with the same email — or a removed one's last report —
    // land on this ledger (usage only ever goes up, so it would stick).
    if (item.username && doc.data().workspace_username !== item.username) continue;
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
