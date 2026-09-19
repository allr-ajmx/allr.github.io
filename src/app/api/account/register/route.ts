import { createProfile } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { badRequest, toResponse } from "@/lib/server/errors";
import type { ProfileDraft } from "@/lib/account/model";

/**
 * The only way an Allr account comes into existence.
 *
 * firestore.rules refuses every client write to `users`, so there is no second
 * path: no console, no direct setDoc, no other provider. requireUser rejects
 * anything that did not come from a Google sign-in, createProfile re-runs the
 * same validation the form ran, and the email address is claimed in the same
 * transaction as the profile — so a second account for one person fails rather
 * than succeeding quietly, which is what used to happen.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);

    let draft: ProfileDraft;
    try {
      draft = (await request.json()) as ProfileDraft;
    } catch {
      throw badRequest("malformed", "We could not read those details.");
    }

    const profile = await createProfile(caller, draft);
    return Response.json({ profile }, { status: 201 });
  } catch (error) {
    return toResponse(error);
  }
}
