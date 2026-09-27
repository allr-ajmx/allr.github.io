import { toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { claimNextOp } from "@/lib/server/provisioning";

/** The VPS worker asks for the next op. 200 with one, or 204. */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const op = await claimNextOp();
    if (!op) return new Response(null, { status: 204 });
    return Response.json(op);
  } catch (error) {
    return toResponse(error);
  }
}
