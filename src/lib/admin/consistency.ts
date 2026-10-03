/**
 * Cross-system consistency, pure. Billing (Razorpay via webhooks), the
 * provisioning queue, the account's workspace fields and the VPS roster are
 * four records of one truth; when they disagree, no single view may present
 * its own half as fact. Every disagreement becomes a named issue an admin sees.
 */

/** A roster row not refreshed for this long means the VPS no longer reports it. */
export const ROSTER_STALE_MS = 30 * 60_000;

export type ConsistencyInput = {
  billingStatus: string | null;
  workspaceUsername: string | null;
  queueStatus: string | null;
  queueUsername: string | null;
  /** When the VPS last reported this workspace (ISO), null if never. */
  rosterSeenAt: string | null;
  /** Is the queue entry's workspace (queueUsername) live on the VPS roster? */
  queueWorkspaceOnVps: boolean;
  /** A promotional month is running (owed a workspace like a payment). */
  promoRunning?: boolean;
  /** ISO time the queue entry last changed (a fresh build), if any. */
  queueUpdatedAt?: string | null;
};

/** A just-built workspace reaches the roster on the next push (~5 min). */
const FRESH_BUILD_MS = 15 * 60_000;

const BUILD_PENDING = new Set(["queued", "claimed", "failed"]);

export type Issue = { code: string; message: string };

/**
 * Owed a workspace and none yet: paid (subscription active), or a promotional
 * month redeemed and still running. The only states in which one is built.
 */
export function awaitingWorkspace(
  billingStatus: string | null | undefined,
  hasWorkspace: boolean,
  promoRunning = false,
): boolean {
  return (billingStatus === "active" || promoRunning) && !hasWorkspace;
}

export function consistencyIssues(c: ConsistencyInput, now = Date.now()): Issue[] {
  const out: Issue[] = [];
  const ws = c.workspaceUsername;
  // A finished or released entry is history, not a pending build.
  if (awaitingWorkspace(c.billingStatus, Boolean(ws), c.promoRunning) && !BUILD_PENDING.has(c.queueStatus ?? "")) {
    out.push({
      code: "paid-not-queued",
      message: `${c.billingStatus === "active" ? "Paid" : "Promo redeemed"}, but nothing is queued to build their workspace. Use Provision…`,
    });
  }
  // Built and still on the VPS, but the account has no link: a lost stamp.
  // (Built then removed is normal; older entries predate "released".)
  if (!ws && c.queueStatus === "provisioned" && c.queueWorkspaceOnVps) {
    out.push({
      code: "built-not-stamped",
      message: `The VPS reported ${c.queueUsername ?? "a workspace"} built, but the account was never linked to it.`,
    });
  }
  if (ws) {
    const seen = c.rosterSeenAt ? Date.parse(c.rosterSeenAt) : NaN;
    const justBuilt =
      c.queueStatus === "provisioned" &&
      c.queueUsername === ws &&
      !!c.queueUpdatedAt &&
      now - Date.parse(c.queueUpdatedAt) < FRESH_BUILD_MS;
    if (!Number.isFinite(seen) && justBuilt) {
      // Not reported yet — expected for a few minutes after a build.
    } else if (!Number.isFinite(seen)) {
      out.push({ code: "not-on-vps", message: `Workspace ${ws} is not on the VPS (never reported, or removed there) — the account still points at it.` });
    } else if (now - seen > ROSTER_STALE_MS) {
      out.push({
        code: "vps-silent",
        message: `The VPS hasn't reported ${ws} for ${Math.round((now - seen) / 60_000)} min — removed outside the panel, or the worker is down.`,
      });
    }
    if (c.queueStatus === "queued" || c.queueStatus === "claimed") {
      out.push({ code: "queued-with-workspace", message: `Has workspace ${ws} yet a build is still queued.` });
    }
  }
  return out;
}
