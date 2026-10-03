import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { readOrAdoptProfile } from "./profiles";
import { enqueueInTransaction, queueRef, reserveUsername } from "./provisioning";
import { shipLog } from "./logship";
import { ledgerFromDoc, targetOf } from "@/lib/billing/credits";
import {
  normalizeCode,
  promoFor,
  redeemVerdict,
  type Promo,
  type PromoCode,
} from "@/lib/billing/promo";

/**
 * Redeeming a promotional code: one transaction checks the code (active, not
 * expired, uses left), that this email has never had a promo, and that the
 * account has no workspace or live subscription — then counts the use,
 * records the redemption, starts the free month and queues the build.
 */

export const CODES = "promo_codes";
export const REDEMPTIONS = "promo_redemptions";
const USERS = "users";

const emailKey = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export function codeFromDoc(d: FirebaseFirestore.DocumentData | undefined): PromoCode | null {
  if (!d) return null;
  return {
    code: String(d.code),
    active: Boolean(d.active),
    maxUses: Number(d.maxUses ?? 0),
    uses: Number(d.uses ?? 0),
    expiresAt: typeof d.expiresAt === "string" ? d.expiresAt : null,
    days: Number(d.days ?? 30),
    creditUsd: Number(d.creditUsd ?? 5),
    note: typeof d.note === "string" ? d.note : undefined,
  };
}

export async function redeemPromo(caller: Caller, rawCode: unknown, rawUsername: unknown): Promise<Promo> {
  const code = normalizeCode(rawCode);
  if (!code) throw badRequest("bad-code", "That code isn’t valid.");

  const profile = await readOrAdoptProfile(caller);
  if (!profile) throw badRequest("no-profile", "Make an account first.");
  // Cheap refusals before a name is reserved; the transaction re-checks all.
  if (profile.workspace_username) {
    throw conflict("has-workspace", "You already have a workspace — codes are for getting started.");
  }
  await reserveUsername(caller, rawUsername ?? profile.pendingWorkspaceUsername);

  const db = adminDb();
  const codeRef = db.collection(CODES).doc(code);
  const redemptionRef = db.collection(REDEMPTIONS).doc(emailKey(caller.email));
  const userRef = db.collection(USERS).doc(caller.uid);
  const now = new Date();

  const promo = await db.runTransaction(async (tx) => {
    const [codeSnap, redeemed, user, queue] = await Promise.all([
      tx.get(codeRef),
      tx.get(redemptionRef),
      tx.get(userRef),
      tx.get(queueRef(caller.uid)),
    ]);
    const d = user.data();
    if (!d) throw badRequest("no-profile", "Make an account first.");
    const promoCode = codeFromDoc(codeSnap.data());
    const verdict = redeemVerdict(
      {
        code: promoCode,
        alreadyRedeemed: redeemed.exists,
        hasWorkspace: Boolean(String(d.workspace_username ?? "").trim()),
        billingStatus: d.billing?.status ?? null,
      },
      now,
    );
    if (!verdict.ok) {
      throw (verdict.reason === "already" || verdict.reason === "has-workspace" || verdict.reason === "subscribed"
        ? conflict
        : badRequest)(`promo-${verdict.reason}`, verdict.message);
    }
    const username = String(d.pending_workspace_username ?? "");
    if (!username) throw badRequest("bad-username", "Pick a name for your workspace first.");

    const p = promoFor(promoCode!, now);
    // A ledger left from an earlier, removed workspace: the month's credit
    // replaces its (zeroed) monthly part; packs and grants stay.
    const ledger = ledgerFromDoc(d.credits);
    const credits = ledger
      ? (() => {
          const next = { ...ledger, includedLeftUsd: p.creditUsd };
          return { ...next, targetLimitUsd: targetOf(next) };
        })()
      : undefined;

    tx.update(codeRef, { uses: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    tx.set(redemptionRef, {
      uid: caller.uid,
      email: caller.email,
      code,
      redeemedAt: FieldValue.serverTimestamp(),
      endsAt: p.endsAt,
    });
    tx.update(userRef, {
      promo: p,
      // The free month is the trial the lifecycle sweep already understands:
      // when it ends unpaid, the workspace pauses (never removed).
      trial: {
        startedAt: Timestamp.fromDate(now),
        endsAt: Timestamp.fromDate(new Date(p.endsAt)),
        creditUsd: p.creditUsd,
        creditUsedUsd: 0,
      },
      ...(credits ? { credits } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    enqueueInTransaction(tx, queue, { uid: caller.uid, email: caller.email, username });
    return p;
  });

  console.log(`[promo] ${caller.email} redeemed ${code}; free until ${promo.endsAt}`);
  shipLog("billing", "promo redeemed", { email: caller.email, code, endsAt: promo.endsAt });
  return promo;
}
