import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { ingestUsage } from "@/lib/server/credits";

/**
 * The worker's roster push: every workspace on the host, site account or not,
 * with its platform telemetry (suspension, versions, key state). Items that
 * carry usage also feed the credit meters — one outbound call from the VPS
 * covers both.
 */

type RosterItem = {
  username: string;
  email: string;
  suspended?: boolean;
  agentTag?: string;
  helixTag?: string;
  orManaged?: boolean;
  orDisabled?: boolean;
  orLimitUsd?: number;
  orUsageUsd?: number;
  orUsageDailyUsd?: number;
  orUsageMonthlyUsd?: number;
};
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as {
      items?: RosterItem[];
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
          suspended: Boolean(item.suspended),
          agentTag: item.agentTag ?? null,
          helixTag: item.helixTag ?? null,
          orManaged: item.orManaged ?? null,
          orDisabled: item.orDisabled ?? null,
          orLimitUsd: Number.isFinite(item.orLimitUsd) ? item.orLimitUsd : null,
          orUsageUsd: Number.isFinite(item.orUsageUsd) ? item.orUsageUsd : null,
          orUsageDailyUsd: Number.isFinite(item.orUsageDailyUsd) ? item.orUsageDailyUsd : null,
          orUsageMonthlyUsd: Number.isFinite(item.orUsageMonthlyUsd) ? item.orUsageMonthlyUsd : null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
    // Usage riding along feeds the same meters the dedicated push does.
    const withUsage = body.items.filter(
      (i) => Number.isFinite(i?.orUsageUsd) && typeof i?.email === "string",
    );
    const metered = withUsage.length
      ? await ingestUsage(withUsage.map((i) => ({ email: i.email, usageUsd: i.orUsageUsd! })))
      : 0;
    return Response.json({ applied: seen.length, metered });
  } catch (error) {
    return toResponse(error);
  }
}
