import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { enqueueOp } from "@/lib/server/provisioning";
import { shipLog } from "@/lib/server/logship";
import {
  decide,
  enforcementAfterSuspend,
  type Enforcement,
} from "@/lib/billing/lifecycle";

/**
 * The hourly sweep: billing truth → platform intent, for every workspace.
 * Called by the VPS worker (machine token) on its own clock; the decisions
 * live here because billing truth does. Every decision that acts is written
 * to `lifecycle_events` — the audit trail for machines turning things off.
 *
 * Suspends mark `enforcement` in the same transaction that queues the op;
 * resumes clear it only when the op completes (see completeOp); removals
 * queue the op and stamp `removalQueuedAt` so the sweep doesn't re-ask.
 */
export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    // Dry runs compute and record nothing — the rehearsal mode the worker
    // uses until ALLR_LIFECYCLE_ENFORCE=1 is set on the box.
    const body = (await request.json().catch(() => ({}))) as { dryRun?: unknown };
    const dryRun = body?.dryRun !== false;
    const db = adminDb();
    const users = await db.collection("users").where("workspace_username", "!=", null).get();

    const summary = {
      dryRun,
      checked: 0,
      suspended: [] as string[],
      resumed: [] as string[],
      removed: [] as string[],
    };
    const now = new Date();

    for (const doc of users.docs) {
      const d = doc.data();
      const username = String(d.workspace_username ?? "").trim();
      if (!username) continue;
      summary.checked++;

      const enforcement = (d.enforcement ?? null) as Enforcement;
      const decision = decide(
        {
          hasWorkspace: true,
          billing: d.billing
            ? {
                status: d.billing.status,
                currentPeriodEnd: d.billing.currentPeriodEnd ?? null,
                statusSince: d.billing.statusSince ?? null,
              }
            : null,
          trialEndsAt: d.trial?.endsAt?.toDate?.()?.toISOString?.() ?? d.trial?.endsAt ?? null,
          enforcement,
        },
        now,
      );
      if (decision.action === "none") continue;
      if (decision.action === "remove" && d.enforcement?.removalQueuedAt) continue;

      summary[
        decision.action === "suspend" ? "suspended" : decision.action === "resume" ? "resumed" : "removed"
      ].push(`${username}: ${decision.reason}`);
      if (dryRun) {
        console.log(`[lifecycle] DRY would ${decision.action} ${username}: ${decision.reason}`);
        continue;
      }

      const op = { uid: d.uid, email: d.email, username, valueUsd: 0 } as const;
      await db.runTransaction(async (tx) => {
        if (decision.action === "suspend") {
          const reason =
            d.billing?.status === "pastDue" || d.billing?.status === "ended" ? "payment" : "trial";
          tx.update(doc.ref, {
            enforcement: enforcementAfterSuspend(reason, now),
            updatedAt: FieldValue.serverTimestamp(),
          });
          enqueueOp(tx, { ...op, op: "suspend" });
        } else if (decision.action === "resume") {
          enqueueOp(tx, { ...op, op: "resume" });
        } else {
          tx.update(doc.ref, {
            enforcement: { ...d.enforcement, removalQueuedAt: now.toISOString() },
            updatedAt: FieldValue.serverTimestamp(),
          });
          enqueueOp(tx, { ...op, op: "remove" });
        }
        tx.set(db.collection("lifecycle_events").doc(), {
          uid: d.uid,
          email: d.email,
          username,
          action: decision.action,
          reason: decision.reason,
          at: FieldValue.serverTimestamp(),
        });
      });
      console.log(`[lifecycle] ${decision.action} ${username}: ${decision.reason}`);
    }

    if (summary.suspended.length || summary.resumed.length || summary.removed.length) {
      shipLog("orchestrator", dryRun ? "lifecycle sweep (dry-run)" : "lifecycle sweep ENFORCED", {
        suspended: summary.suspended.join("; "),
        resumed: summary.resumed.join("; "),
        removed: summary.removed.join("; "),
      }, dryRun ? "info" : "warn");
    }
    return Response.json(summary);
  } catch (error) {
    return toResponse(error);
  }
}
