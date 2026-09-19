import { requestEarlyAccess } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { badRequest, toResponse } from "@/lib/server/errors";
import type { EarlyAccessRequest } from "@/lib/account/model";

/**
 * Join the queue.
 *
 * Deliberately its own route rather than a flag on registration: having an
 * account and asking for access are different decisions, and merging them put
 * everybody who signed up into a queue whether they meant to be or not.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireUser(request);

    let body: EarlyAccessRequest;
    try {
      body = (await request.json()) as EarlyAccessRequest;
    } catch {
      throw badRequest("malformed", "We could not read that request.");
    }

    const profile = await requestEarlyAccess(caller, {
      mobilePlatforms: body.mobilePlatforms,
    });
    return Response.json({ profile });
  } catch (error) {
    return toResponse(error);
  }
}
