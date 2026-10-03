import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { redeemPromo } from "@/lib/server/promo";

/** Redeem a promotional code: a free month, then the workspace is built. */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);
    const body = (await request.json().catch(() => ({}))) as { code?: unknown; username?: unknown };
    return Response.json({ promo: await redeemPromo(caller, body.code, body.username) });
  } catch (error) {
    return toResponse(error);
  }
}
