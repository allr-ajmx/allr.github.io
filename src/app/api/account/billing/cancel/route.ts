import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { cancelSubscription } from "@/lib/server/billing";

/** Cancel at the end of the paid period. */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    return Response.json({ billing: await cancelSubscription(caller) });
  } catch (error) {
    return toResponse(error);
  }
}
