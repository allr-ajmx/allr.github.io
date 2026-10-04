import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { startCreditSubscription } from "@/lib/server/billing";

/**
 * Start or replace the monthly AI-credit subscription. The workspace
 * subscription has to be active first. Checkout still has to succeed; this
 * only opens the mandate.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { amountUsd?: unknown };
    return Response.json(await startCreditSubscription(caller, body.amountUsd));
  } catch (error) {
    return toResponse(error);
  }
}
