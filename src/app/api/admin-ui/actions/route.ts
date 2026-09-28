import { requireAdminUser } from "@/lib/server/admin-gate";
import { toResponse } from "@/lib/server/errors";
import { applyAdminAction, parseAction } from "@/lib/server/admin-actions";

/** An admin pulls a lever. Verified token + allowlist; recorded with who. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser(request);
    const action = parseAction(await request.json().catch(() => null));
    await applyAdminAction(admin, action);
    return Response.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
