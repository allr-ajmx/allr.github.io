import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { enqueueOp } from "@/lib/server/provisioning";
import { PaidAgain, stopBillingForRemoval } from "@/lib/server/billing";
import { shipLog } from "@/lib/server/logship";
import { hasExpiredGrant, ledgerFromDoc } from "@/lib/billing/credits";
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
      grantsExpired: [] as string[],
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

      // Credit-grant expiry: accounting, not lifecycle — runs even in dry-run,
      // because the customer was promised that date. Settlement happens on
      // the worker against live usage (sync_limit), never here.
      const ledger = ledgerFromDoc(d.credits);
      if (ledger && hasExpiredGrant(ledger, now)) {
        await db.runTransaction(async (tx) => {
          enqueueOp(tx, { uid: d.uid, email: d.email, username, op: "sync_limit", valueUsd: 0 });
        });
        summary.grantsExpired.push(username);
      }

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
      if (decision.action === "remove") {
        // A pastDue subscription may still be retrying charges: stop it before
        // the workspace is deleted. If that fails, skip this workspace this
        // hour rather than delete something still being billed.
        try {
          await stopBillingForRemoval(doc.id, false, { refusePaid: true });
        } catch (e) {
          // Paid meanwhile: leave it; the webhook / next sweep resumes them.
          const paid = e instanceof PaidAgain;
          console.error(`[lifecycle] not removing ${username}: ${paid ? "they paid" : "billing stop failed"}`, e);
          shipLog("orchestrator", paid ? "removal skipped: customer paid" : "removal skipped: billing stop failed",
            { username, error: String((e as Error)?.message ?? e) }, paid ? "warn" : "error");
          continue;
        }
      }
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

    if (summary.grantsExpired.length) {
      shipLog("billing", "credit grants expired", { workspaces: summary.grantsExpired.join(", ") });
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
