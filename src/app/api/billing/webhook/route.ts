import { verifyWebhookSignature } from "@/lib/billing/signature";
import { applyWebhookEvent } from "@/lib/server/billing";
import type { RzpSubscription } from "@/lib/server/razorpay";

/**
 * Razorpay calls this; nobody else can produce the signature. This route is
 * the only writer of billing state that matters — the browser's checkout
 * callback is a courtesy, this is the truth.
 *
 * Always 200 once the signature checks out: a 5xx makes Razorpay retry, and
 * retrying an event we chose to ignore is noise, not safety.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[billing] webhook hit but RAZORPAY_WEBHOOK_SECRET is unset");
    return new Response(null, { status: 503 });
  }

  // The signature covers the raw bytes; parse only after verifying.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, signature, secret)) {
    console.error("[billing] webhook signature mismatch");
    return new Response(null, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { subscription?: { entity?: RzpSubscription } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const name = event.event ?? "";
  try {
    const outcome = await applyWebhookEvent(
      eventId || `${name}:${event.payload?.subscription?.entity?.id}:${raw.length}`,
      name,
      event.payload?.subscription?.entity,
    );
    console.log(`[billing] ${name} ${eventId}: ${outcome}`);
    return Response.json({ outcome });
  } catch (error) {
    // Our failure, not theirs — let Razorpay redeliver.
    console.error("[billing] webhook apply failed", name, eventId, error);
    return new Response(null, { status: 500 });
  }
}
