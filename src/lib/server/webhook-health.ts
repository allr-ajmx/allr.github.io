import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { shipLog } from "./logship";

/**
 * Whether Razorpay's webhooks are actually reaching us. A webhook that never
 * arrives (wrong URL, a redirect, disabled in the dashboard) leaves no trace
 * on our side, so the route stamps every verified delivery here and the
 * reconciler reads it: missed events plus a stale stamp = the webhook path is
 * down, said once instead of one "webhook missed" flag per subscription.
 *
 * Neither write may fail a delivery: both swallow their own errors.
 */

const HEALTH = () => adminDb().collection("billing_health").doc("webhook");

/** A delivery passed the signature check. */
export async function noteWebhookVerified(eventName: string): Promise<void> {
  try {
    await HEALTH().set({ lastVerifiedAt: new Date().toISOString(), lastEvent: eventName }, { merge: true });
  } catch (e) {
    console.error("[billing] could not stamp webhook health", e);
  }
}

/**
 * A delivery that looked like Razorpay's was refused before it could be
 * applied. One flagged row per hour, so a persistent misconfiguration is one
 * line in Needs attention, not one per event.
 */
export async function noteWebhookRejected(cause: "signature" | "unconfigured", now = new Date()): Promise<void> {
  const reason = cause === "signature"
    ? "Razorpay webhook refused: signature mismatch — RAZORPAY_WEBHOOK_SECRET on the site doesn't match the secret of the live-mode webhook in Razorpay"
    : "Razorpay webhook refused: RAZORPAY_WEBHOOK_SECRET is not set on the site";
  shipLog("billing", reason, { cause }, "error");
  try {
    await adminDb().collection("billing_events").doc(`webhook-rejected:${now.toISOString().slice(0, 13)}`).set({
      eventName: "webhook",
      outcome: "rejected",
      reason,
      flag: true,
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[billing] could not record a refused webhook", e);
  }
}
