import { requireUser } from "@/lib/server/session";
import { badRequest, toResponse } from "@/lib/server/errors";
import { quoteFor } from "@/lib/server/billing";
import { quoteTopup } from "@/lib/server/credits";
import { readOrAdoptProfile } from "@/lib/server/profiles";
import { packById } from "@/lib/billing/credits";

/**
 * A bill before Checkout opens, in the caller's currency at today's rate,
 * with GST: `?creditUsd=5` for the workspace plan with that monthly AI
 * credit, `?pack=m` for a one-time credit pack.
 */
export async function GET(request: Request) {
  try {
    const caller = await requireUser(request);
    const params = new URL(request.url).searchParams;
    const packId = params.get("pack");
    if (packId !== null) {
      const pack = packById(packId);
      if (!pack) throw badRequest("bad-pack", "Pick one of the credit packs.");
      const profile = await readOrAdoptProfile(caller);
      if (!profile) throw badRequest("no-profile", "Make an account first.");
      return Response.json(await quoteTopup(profile.country, pack.priceUsd));
    }
    return Response.json(await quoteFor(caller, params.get("creditUsd") ?? 0));
  } catch (error) {
    return toResponse(error);
  }
}
