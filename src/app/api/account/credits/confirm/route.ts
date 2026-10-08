import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { confirmTopup } from "@/lib/server/credits";

/**
 * Checkout's success handler for a credit pack: apply the payment from
 * Razorpay's own record now, without waiting for the webhook.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { paymentId?: unknown };
    return Response.json(await confirmTopup(caller, body.paymentId));
  } catch (error) {
    return toResponse(error);
  }
}
