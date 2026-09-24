import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { completeClaim } from "@/lib/server/provisioning";

/**
 * The worker reports how it went. Success does not stamp the profile — the
 * create job's own `site` step already did that through /api/admin/workspace.
 */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as {
      uid?: unknown;
      ok?: unknown;
      error?: unknown;
    } | null;
    if (typeof body?.uid !== "string" || typeof body.ok !== "boolean") {
      throw badRequest("invalid", "Send {uid, ok, error?}.");
    }
    await completeClaim(body.uid, body.ok, typeof body.error === "string" ? body.error : undefined);
    return Response.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
