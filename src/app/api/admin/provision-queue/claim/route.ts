import { toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { claimNext } from "@/lib/server/provisioning";

/** The VPS worker asks for work. 200 with an entry, or 204: nothing to do. */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const entry = await claimNext();
    if (!entry) return new Response(null, { status: 204 });
    return Response.json(entry);
  } catch (error) {
    return toResponse(error);
  }
}
