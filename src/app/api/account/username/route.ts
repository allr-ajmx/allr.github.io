import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";
import { usernameAvailable } from "@/lib/server/provisioning";
import { checkUsernameShape } from "@/lib/admin/username";

/** Is this workspace name free? Signed-in only, so the ledger isn't scrapable. */
export async function GET(request: Request) {
  try {
    await requireUser(request);
    const raw = new URL(request.url).searchParams.get("u") ?? "";
    const verdict = checkUsernameShape(raw);
    if (!verdict.ok) {
      return Response.json({ available: false, reason: verdict.reason });
    }
    const available = await usernameAvailable(verdict.username);
    return Response.json({
      available,
      reason: available ? null : "That name is taken. Try another?",
    });
  } catch (error) {
    return toResponse(error);
  }
}
