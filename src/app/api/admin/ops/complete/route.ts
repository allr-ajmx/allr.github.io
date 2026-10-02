import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { completeOp } from "@/lib/server/provisioning";

export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as {
      id?: unknown; ok?: unknown; error?: unknown; gen?: unknown;
    } | null;
    if (typeof body?.id !== "string" || typeof body.ok !== "boolean") {
      throw badRequest("invalid", "Send {id, ok, error?}.");
    }
    await completeOp(
      body.id,
      body.ok,
      typeof body.error === "string" ? body.error : undefined,
      typeof body.gen === "number" ? body.gen : undefined,
    );
    return Response.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
