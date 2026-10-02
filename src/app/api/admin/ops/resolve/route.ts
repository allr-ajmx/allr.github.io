import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { resolveLimit } from "@/lib/server/provisioning";

/** sync_limit: the worker reports live usage; we settle and return the limit. */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as { id?: unknown; usageUsd?: unknown } | null;
    if (typeof body?.id !== "string" || typeof body.usageUsd !== "number") {
      throw badRequest("invalid", "Send {id, usageUsd}.");
    }
    return Response.json(await resolveLimit(body.id, body.usageUsd));
  } catch (error) {
    return toResponse(error);
  }
}
