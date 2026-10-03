import { deriveState } from "@/lib/account/state";
import { ensureTrial, readOrAdoptProfile } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { isAdminEmail } from "@/lib/server/admin-gate";
import { toResponse } from "@/lib/server/errors";

/**
 * The profile, and where its owner stands in the journey.
 *
 * The state is derived here rather than stored, so it cannot disagree with the
 * document it came from — and the workspace fields are edited by hand, by
 * whatever provisions them, so disagreement would be the normal case.
 *
 * This is also where the promotional week gets stamped: the provisioning side
 * sets three fields and knows nothing about trials, so the first read that sees
 * a complete workspace starts the clock.
 */
export async function GET(request: Request) {
  try {
    const caller = await requireUser(request);
    let profile = await readOrAdoptProfile(caller);
    // Manual-era workspaces are linked by an admin ("Link" on the Customers
    // page), never guessed at sign-in — guessing re-attached removed ones.
    if (profile) profile = await ensureTrial(profile);

    return Response.json({
      profile,
      state: deriveState(profile),
      // Derived from the verified token against the server-side allowlist;
      // the admin APIs re-check it themselves, so this only shapes the UI.
      isAdmin: isAdminEmail(caller.email),
    });
  } catch (error) {
    return toResponse(error);
  }
}
