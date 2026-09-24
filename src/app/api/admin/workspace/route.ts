import { toResponse } from "@/lib/server/errors";
import {
  parseStamp,
  requireAdminToken,
  stampWorkspace,
} from "@/lib/server/workspace-admin";

/**
 * The provisioner announces a workspace. Bearer ALLR_ADMIN_API_TOKEN; body
 * `{email, username, workspaceEmail, address}` to set, `{email}` to clear.
 * Idempotent — stamping the same thing twice is two 200s.
 */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const stamp = parseStamp(await request.json().catch(() => null));
    const result = await stampWorkspace(stamp);
    return Response.json(result);
  } catch (error) {
    return toResponse(error);
  }
}
