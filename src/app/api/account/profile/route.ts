import { updateProfile } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { badRequest, toResponse } from "@/lib/server/errors";
import type { ProfilePatch } from "@/lib/account/model";

/**
 * Change what a person owns.
 *
 * The patch is read field by field rather than spread, so a body carrying
 * `workspace_username` or `trial` changes nothing: those belong to the server
 * and to whoever provisions workspaces. Email is not editable either — it comes
 * from the Google token, and letting it move would orphan the claim that keeps
 * one account per address.
 */
export async function PATCH(request: Request) {
  try {
    const caller = await requireUser(request);

    let body: ProfilePatch;
    try {
      body = (await request.json()) as ProfilePatch;
    } catch {
      throw badRequest("malformed", "We could not read those details.");
    }

    const profile = await updateProfile(caller, {
      name: body.name,
      dateOfBirth: body.dateOfBirth,
      country: body.country,
      accountType: body.accountType,
      entityName: body.entityName,
      marketingOptIn: body.marketingOptIn,
      mobilePlatforms: body.mobilePlatforms,
    });

    return Response.json({ profile });
  } catch (error) {
    return toResponse(error);
  }
}
