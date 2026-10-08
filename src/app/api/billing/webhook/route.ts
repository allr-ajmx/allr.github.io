import { verifyWebhookSignature } from "@/lib/billing/signature";
import { recordIgnoredWebhook } from "@/lib/server/billing";
import { syncSubscription } from "@/lib/server/subscriptions";
import { applyTopupPayment } from "@/lib/server/credits";
import type { RzpPayment, RzpRefund, RzpSubscription } from "@/lib/server/razorpay";
import { applyRefund, recordDispute, type RzpDispute } from "@/lib/server/payments";
import { noteWebhookRejected, noteWebhookVerified } from "@/lib/server/webhook-health";

/**
 * Razorpay calls this; nobody else can produce the signature. This route is
 * the only writer of billing state that matters — the browser's checkout
 * callback is a courtesy, this is the truth.
 *
 * Always 200 once the signature checks out: a 5xx makes Razorpay retry, and
 * retrying an event we chose to ignore is noise, not safety.
 */
export async function POST(request: Request) {
  // A refusal is recorded (once an hour) only when the request carries
  // Razorpay's signature header: a misconfigured secret must be visible, a
  // stray POST from anywhere else is not worth a flag.
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[billing] webhook hit but RAZORPAY_WEBHOOK_SECRET is unset");
    if (signature) await noteWebhookRejected("unconfigured");
    return new Response(null, { status: 503 });
  }

  // The signature covers the raw bytes; parse only after verifying.
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, signature, secret)) {
    console.error("[billing] webhook signature mismatch");
    if (signature) await noteWebhookRejected("signature");
    return new Response(null, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: RzpSubscription };
      payment?: { entity?: RzpPayment };
      refund?: { entity?: RzpRefund };
      dispute?: { entity?: RzpDispute };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const name = event.event ?? "";
  await noteWebhookVerified(name);
  try {
    // Credit top-ups arrive as captured one-time payments; idempotent by
    // payment id inside, so no event-id bookkeeping is needed here.
    if ((name === "payment.captured" || name === "payment.authorized") && event.payload?.payment?.entity) {
      const outcome = await applyTopupPayment(event.payload.payment.entity, eventId);
      console.log(`[billing] ${name} ${eventId}: ${outcome}`);
      return Response.json({ outcome });
    }
    if (name.startsWith("refund.") && event.payload?.refund?.entity) {
      const outcome = await applyRefund(event.payload.refund.entity);
      console.log(`[billing] ${name} ${eventId}: ${outcome}`);
      return Response.json({ outcome });
    }
    if (name.startsWith("payment.dispute.") && event.payload?.dispute?.entity) {
      await recordDispute(name, event.payload.dispute.entity);
      return Response.json({ outcome: "recorded" });
    }
    // Subscription events are a nudge: the sync fetches Razorpay's current
    // state of that subscription and applies it (the payload is only the
    // fallback if Razorpay can't be reached). Order and redelivery can't matter.
    const sub = event.payload?.subscription?.entity;
    if (name.startsWith("subscription.") && sub?.id) {
      const outcome = await syncSubscription(sub.id, { source: "webhook", eventName: name }, sub);
      console.log(`[billing] ${name} ${eventId}: ${outcome}`);
      return Response.json({ outcome });
    }
    if (name.startsWith("subscription.")) {
      await recordIgnoredWebhook(eventId || `${name}:${raw.length}`, name,
        "subscription event without a subscription entity", { subscriptionId: null });
    }
    return Response.json({ outcome: "ignored" });
  } catch (error) {
    // Our failure, not theirs — let Razorpay redeliver.
    console.error("[billing] webhook apply failed", name, eventId, error);
    return new Response(null, { status: 500 });
  }
}
