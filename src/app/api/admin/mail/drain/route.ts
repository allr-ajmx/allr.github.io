import { requireAdminToken } from "@/lib/server/workspace-admin";
import { toResponse } from "@/lib/server/errors";
import { processMail } from "@/lib/server/mail";

/**
 * The VPS worker's mail tick (bearer token, like the others): queue the admin
 * digest if anything is new, then send every email that is due. The safety
 * net under `after()` — a function frozen mid-send, or SMTP down for an hour.
 */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    return Response.json(await processMail());
  } catch (error) {
    return toResponse(error);
  }
}
