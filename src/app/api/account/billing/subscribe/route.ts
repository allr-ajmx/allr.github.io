import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { startSubscription } from "@/lib/server/billing";

/**
 * Create (or resume) the caller's subscription. Returns what Razorpay
 * Checkout needs; money only moves inside Checkout, and the profile only
 * flips to `active` when the webhook says so.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { username?: unknown };
    return Response.json(await startSubscription(caller, body.username));
  } catch (error) {
    return toResponse(error);
  }
}
