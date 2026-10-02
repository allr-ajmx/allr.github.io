import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { requireAdminUser } from "@/lib/server/admin-gate";
import { toResponse } from "@/lib/server/errors";
import { deriveState } from "@/lib/account/state";
import { remaining, spentThisCycle } from "@/lib/billing/credits";
import type { UserProfile } from "@/lib/account/model";

/**
 * Everything an admin needs to see about the customers, in one read-only
 * list. Signed-in + allowlisted only (admin-gate); the machine-token
 * /api/admin/* namespace is for the VPS worker and stays separate.
 */

const iso = (v: unknown) =>
  v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : null;

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const db = adminDb();

    const [users, queue, ops, roster] = await Promise.all([
      db.collection("users").orderBy("createdAt", "desc").limit(500).get(),
      db.collection("provision_queue").get(),
      db.collection("workspace_ops").where("status", "in", ["queued", "claimed", "failed"]).limit(100).get(),
      db.collection("workspace_roster").get(),
    ]);

    const queueByUid = new Map(queue.docs.map((d) => [d.id, d.data()]));
    const rosterByUsername = new Map(roster.docs.map((d) => [d.id, d.data()]));
    const platform = (username: string | null | undefined) => {
      const r = username ? rosterByUsername.get(username) : undefined;
      return r
        ? {
            suspended: Boolean(r.suspended),
            agentTag: r.agentTag ?? null,
            helixTag: r.helixTag ?? null,
            orManaged: r.orManaged ?? null,
            orDisabled: r.orDisabled ?? null,
            orLimitUsd: r.orLimitUsd ?? null,
            orUsageUsd: r.orUsageUsd ?? null,
            orUsageDailyUsd: r.orUsageDailyUsd ?? null,
            orUsageMonthlyUsd: r.orUsageMonthlyUsd ?? null,
            seenAt: iso(r.updatedAt),
          }
        : null;
    };

    const customers = users.docs.map((doc) => {
      const d = doc.data();
      // deriveState wants the API shape; billing/trial pass through as stored.
      const profileish = {
        ...d,
        billing: d.billing ?? null,
        trial: d.trial ?? null,
        earlyAccessRequestedAt: iso(d.earlyAccessRequestedAt),
      } as unknown as UserProfile;
      const q = queueByUid.get(doc.id);
      const credits = d.credits
        ? {
            remaining: remaining(d.credits),
            spentThisCycleUsd: spentThisCycle(d.credits),
            topupBalanceUsd: Number(d.credits.topupBalanceUsd ?? 0),
            usageSyncedAt: d.credits.usageSyncedAt ?? null,
          }
        : null;
      return {
        uid: d.uid,
        email: d.email,
        name: d.name ?? "",
        country: d.country ?? "",
        createdAt: iso(d.createdAt),
        state: deriveState(profileish),
        workspace: d.workspace_username
          ? { username: d.workspace_username, address: d.workspace_address ?? "" }
          : null,
        pendingUsername: d.pending_workspace_username ?? null,
        billing: d.billing
          ? {
              status: d.billing.status,
              planCurrency: d.billing.planCurrency,
              currentPeriodEnd: d.billing.currentPeriodEnd ?? null,
            }
          : null,
        credits,
        queue: q ? { status: q.status, error: q.error ?? null } : null,
        platform: platform(d.workspace_username),
        enforcement: d.enforcement
          ? {
              reason: d.enforcement.reason,
              suspendedAt: d.enforcement.suspendedAt ?? null,
              removeAfter: d.enforcement.removeAfter ?? null,
            }
          : null,
      };
    });

    // Workspaces the VPS knows that no site account claims — the manually
    // created era. Shown so the whole fleet is on one page.
    const accountEmails = new Set(users.docs.map((d) => String(d.data().email ?? "").toLowerCase()));
    const claimedUsernames = new Set(
      users.docs.map((d) => String(d.data().workspace_username ?? "")).filter(Boolean),
    );
    const workspaceOnly = roster.docs
      .map((d) => d.data())
      .filter((r) => !accountEmails.has(String(r.email).toLowerCase()) && !claimedUsernames.has(r.username))
      .map((r) => ({
        username: r.username,
        email: r.email,
        updatedAt: iso(r.updatedAt),
        suspended: Boolean(r.suspended),
        agentTag: r.agentTag ?? null,
      }));

    return Response.json({
      customers,
      workspaceOnly,
      pendingOps: ops.docs.map((d) => ({
        id: d.id,
        op: d.data().op,
        username: d.data().username,
        status: d.data().status,
        error: d.data().error ?? null,
      })),
    });
  } catch (error) {
    return toResponse(error);
  }
}
