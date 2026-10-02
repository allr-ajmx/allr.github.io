import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { requireAdminUser } from "@/lib/server/admin-gate";
import { toResponse } from "@/lib/server/errors";

/**
 * The operations timeline: everything the machines and admins did, merged
 * newest-first from the audit collections. Read-only; admin-gated like the
 * rest of /api/admin-ui.
 */

export type OperationEvent = {
  at: string;
  kind: "lifecycle" | "admin" | "billing" | "credit" | "ops" | "provision";
  summary: string;
  detail: string | null;
  /** "ok" | "failed" | null — drives the red accent in the feed. */
  status: string | null;
};

const iso = (v: unknown): string =>
  v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : "";

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const db = adminDb();

    const [lifecycle, admin, billing, credits, ops, queue, users] = await Promise.all([
      db.collection("lifecycle_events").orderBy("at", "desc").limit(40).get(),
      db.collection("admin_actions").orderBy("at", "desc").limit(40).get(),
      db.collection("billing_events").orderBy("receivedAt", "desc").limit(40).get(),
      db.collection("credit_purchases").orderBy("createdAt", "desc").limit(20).get(),
      db.collection("workspace_ops").orderBy("updatedAt", "desc").limit(40).get(),
      db.collection("provision_queue").orderBy("updatedAt", "desc").limit(20).get(),
      db.collection("users").limit(500).get(),
    ]);

    const email = new Map(users.docs.map((u) => [u.id, String(u.data().email ?? u.id)]));
    const who = (uid: unknown) => email.get(String(uid)) ?? String(uid ?? "?");

    const events: OperationEvent[] = [
      ...lifecycle.docs.map((d) => {
        const x = d.data();
        return {
          at: iso(x.at),
          kind: "lifecycle" as const,
          summary: `enforcer: ${x.action} ${x.username}`,
          detail: x.reason ?? null,
          status: null,
        };
      }),
      ...admin.docs.map((d) => {
        const x = d.data();
        return {
          at: iso(x.at),
          kind: "admin" as const,
          summary: `${x.by}: ${x.action} ${x.username ?? who(x.uid)}`,
          detail: x.detail != null ? String(x.detail) : null,
          status: null,
        };
      }),
      ...billing.docs.map((d) => {
        const x = d.data();
        return {
          at: iso(x.receivedAt),
          kind: "billing" as const,
          summary: `${x.eventName} · ${who(x.uid)}`,
          detail: x.outcome ?? null,
          status: null,
        };
      }),
      ...credits.docs.map((d) => {
        const x = d.data();
        return {
          at: iso(x.createdAt),
          kind: "credit" as const,
          summary: `top-up $${x.creditUsd} · ${who(x.uid)}`,
          detail: null,
          status: null,
        };
      }),
      ...ops.docs.map((d) => {
        const x = d.data();
        return {
          at: iso(x.updatedAt),
          kind: "ops" as const,
          summary: `${x.op} ${x.username || x.email || ""} → ${x.status}`,
          detail: x.error ?? null,
          status: x.status === "failed" ? "failed" : x.status === "done" ? "ok" : null,
        };
      }),
      ...queue.docs.map((d) => {
        const x = d.data();
        return {
          at: iso(x.updatedAt),
          kind: "provision" as const,
          summary: `provision ${x.username} (${x.email}) → ${x.status}`,
          detail: x.error ?? null,
          status: x.status === "failed" ? "failed" : x.status === "provisioned" ? "ok" : null,
        };
      }),
    ]
      .filter((e) => e.at)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 120);

    return Response.json({ events });
  } catch (error) {
    return toResponse(error);
  }
}
