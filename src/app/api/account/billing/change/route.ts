import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { startPlanChange } from "@/lib/server/billing";

/**
 * Switch plan: returns the subscription Checkout must authorise (and, for an
 * upgrade, the prorated amount it charges now). Nothing changes until Razorpay
 * confirms the mandate; the billing core takes it from there.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { plan?: unknown };
    return Response.json(await startPlanChange(caller, body.plan));
  } catch (error) {
    return toResponse(error);
  }
}
