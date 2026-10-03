import { requireAdminToken } from "@/lib/server/workspace-admin";
import { toResponse } from "@/lib/server/errors";
import { reconcile } from "@/lib/server/reconcile";

/** The VPS worker's periodic safety-net call (bearer token, like the others). */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    return Response.json(await reconcile());
  } catch (error) {
    return toResponse(error);
  }
}
