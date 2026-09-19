import { readUrls } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { toResponse } from "@/lib/server/errors";

/**
 * Everything the workspace has published for this person.
 *
 * A subcollection under the user rather than an array on the document: a
 * published-URL list only grows, a document caps at 1 MiB, and an array has to
 * be rewritten whole every time one is added.
 *
 * Nothing writes here yet — the workspace will, from its own side.
 */
export async function GET(request: Request) {
  try {
    const caller = await requireUser(request);
    return Response.json({ urls: await readUrls(caller.uid) });
  } catch (error) {
    return toResponse(error);
  }
}
