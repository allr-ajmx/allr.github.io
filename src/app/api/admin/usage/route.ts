import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { ingestUsage } from "@/lib/server/credits";

/** The worker's periodic usage push: {items: [{email, usageUsd}]}. */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as {
      items?: { email: string; usageUsd: number }[];
    } | null;
    if (!Array.isArray(body?.items)) throw badRequest("invalid", "Send {items: […]}.");
    return Response.json({ applied: await ingestUsage(body.items) });
  } catch (error) {
    return toResponse(error);
  }
}
