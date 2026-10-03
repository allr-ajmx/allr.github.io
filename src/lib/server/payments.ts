import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { enqueueOp } from "./provisioning";
import { shipLog } from "./logship";
import type { RzpRefund } from "./razorpay";
import { ledgerFromDoc, queueChange } from "@/lib/billing/credits";
import { creditToRevoke } from "@/lib/billing/reconcile";

/**
 * Money moving back: refunds (made by us, from the Razorpay dashboard, or by
 * the bank) and disputes. Idempotent by refund / dispute id, so the webhook
 * and the reconciler can both see the same one.
 *
 * - A refund on a credit pack takes back the unspent part of that pack.
 * - A refund on anything else that WE didn't make (notes.by = allr) is
 *   flagged: a refunded subscription charge leaves the subscription running,
 *   and only a person should decide whether to cancel it.
 * - Every dispute is flagged.
 */

const EVENTS = "billing_events";
const PURCHASES = "credit_purchases";

const ours = (notes: unknown) =>
  !!notes && !Array.isArray(notes) && (notes as Record<string, string>).by === "allr";

export async function applyRefund(
  refund: RzpRefund,
  { source = "webhook" }: { source?: "webhook" | "reconcile" } = {},
): Promise<"applied" | "duplicate" | "recorded" | "ignored"> {
  if (refund.status === "failed") return "ignored";
  const db = adminDb();
  const eventRef = db.collection(EVENTS).doc(`refund:${refund.id}`);
  const purchaseRef = db.collection(PURCHASES).doc(refund.payment_id);

  return db.runTransaction(async (tx) => {
    const [seen, purchase] = await Promise.all([tx.get(eventRef), tx.get(purchaseRef)]);
    if (seen.exists) return "duplicate" as const;
    const p = purchase.data();
    const record = (fields: Record<string, unknown>) =>
      tx.set(eventRef, {
        eventName: "refund.processed",
        paymentId: refund.payment_id,
        refundId: refund.id,
        amountMinor: refund.amount,
        receivedAt: FieldValue.serverTimestamp(),
        ...fields,
      });

    if (p) {
      // An automatic refund we made because the pack couldn't be applied:
      // nothing was credited, so there is nothing to take back.
      if (p.status === "refunding" || p.status === "refunded" || p.status === "refund-failed") {
        if (p.status !== "refunded") tx.update(purchaseRef, { status: "refunded", refundIds: FieldValue.arrayUnion(refund.id) });
        record({ uid: p.uid ?? null, outcome: "known", reason: "automatic top-up refund", flag: false });
        return "recorded" as const;
      }
      const revoke = creditToRevoke(Number(p.creditUsd ?? 0), Number(p.amountMinor ?? 0), refund.amount);
      const userRef = db.collection("users").doc(String(p.uid));
      const user = await tx.get(userRef);
      const d = user.data();
      const ledger = ledgerFromDoc(d?.credits);
      if (d && ledger && revoke > 0) {
        tx.update(userRef, {
          credits: queueChange(ledger, { type: "refund_topup", usd: revoke }),
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (String(d.workspace_username ?? "").trim()) {
          enqueueOp(tx, { uid: userRef.id, email: d.email, username: d.workspace_username, op: "sync_limit", valueUsd: 0 });
        }
      }
      tx.update(purchaseRef, {
        status: "refunded",
        refundIds: FieldValue.arrayUnion(refund.id),
        refundedMinor: FieldValue.increment(refund.amount),
      });
      record({
        uid: p.uid ?? null,
        outcome: "applied",
        reason: `credit pack refunded — $${revoke.toFixed(2)} of unspent credit taken back`,
        flag: false,
      });
      return "applied" as const;
    }

    if (ours(refund.notes)) {
      record({ outcome: "known", reason: "refund made by Allr", flag: false });
      return "recorded" as const;
    }
    record({
      outcome: "needs-decision",
      reason:
        "refund made outside Allr on a subscription payment — the subscription is still running; cancel it if that was the intent",
      flag: true,
      resolved: false,
    });
    return "recorded" as const;
  }).then((r) => {
    shipLog("billing", `refund ${r}`, { refund: refund.id, payment: refund.payment_id, source },
      r === "recorded" && !ours(refund.notes) ? "warn" : "info");
    return r;
  });
}

export type RzpDispute = { id: string; payment_id: string; amount: number; currency?: string; status?: string; reason_code?: string; phase?: string };

/** Disputes are flagged, every phase, once per (dispute, event). */
export async function recordDispute(eventName: string, dispute: RzpDispute): Promise<void> {
  const settled = /won|closed/.test(eventName);
  await adminDb()
    .collection(EVENTS)
    .doc(`dispute:${dispute.id}:${eventName}`)
    .set({
      eventName,
      paymentId: dispute.payment_id,
      disputeId: dispute.id,
      amountMinor: dispute.amount,
      outcome: dispute.status ?? eventName.split(".").pop(),
      reason: `dispute ${dispute.phase ?? ""} ${dispute.reason_code ?? ""}`.replace(/\s+/g, " ").trim(),
      flag: !settled,
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
  shipLog("billing", `dispute ${eventName}`, { dispute: dispute.id, payment: dispute.payment_id }, settled ? "info" : "error");
}
