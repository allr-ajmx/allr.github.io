import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { confirmCheckout } from "@/lib/server/billing";

/**
 * Checkout's success handler: apply the caller's subscription from
 * Razorpay's current state now, without waiting for the webhook.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { subscriptionId?: unknown };
    return Response.json(await confirmCheckout(caller, body.subscriptionId));
  } catch (error) {
    return toResponse(error);
  }
}
