import { ensureTrial, readOrAdoptProfile } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { toResponse, badRequest } from "@/lib/server/errors";
import { summarize } from "@/lib/server/billing";

/** Where the caller stands: their billing block and the plan they'd be on. */
export async function GET(request: Request) {
  try {
    const caller = await requireUser(request);
    let profile = await readOrAdoptProfile(caller);
    if (!profile) throw badRequest("no-profile", "Make an account first.");
    profile = await ensureTrial(profile);
    return Response.json(summarize(profile));
  } catch (error) {
    return toResponse(error);
  }
}
