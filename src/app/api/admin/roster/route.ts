import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";

/**
 * The worker's roster push: every workspace on the host, site account or not.
 * This is how manually created workspaces show up on the admin dashboard.
 */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as {
      items?: { username: string; email: string }[];
    } | null;
    if (!Array.isArray(body?.items)) throw badRequest("invalid", "Send {items: […]}.");

    const db = adminDb();
    const batch = db.batch();
    const seen: string[] = [];
    for (const item of body.items.slice(0, 200)) {
      if (typeof item?.username !== "string" || typeof item?.email !== "string") continue;
      const username = item.username.trim().toLowerCase();
      if (!username) continue;
      seen.push(username);
      batch.set(
        db.collection("workspace_roster").doc(username),
        {
          username,
          email: item.email.trim().toLowerCase(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
    return Response.json({ applied: seen.length });
  } catch (error) {
    return toResponse(error);
  }
}
