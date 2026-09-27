import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { startTopup } from "@/lib/server/credits";

/** Create the one-time order a credit-pack Checkout will pay. */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { pack?: unknown };
    return Response.json(await startTopup(caller, body.pack));
  } catch (error) {
    return toResponse(error);
  }
}
