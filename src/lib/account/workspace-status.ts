/**
 * Where the customer's workspace stands, in one word — the single answer the
 * Overview, Billing and Credits pages all render from, so no two of them can
 * tell the person different stories. Pure; derived on every read.
 *
 * Order matters: a paused workspace is paused whatever billing says, and a
 * workspace that exists outranks a checkout that is still open.
 */

import type { UserProfile } from "./model";
import { hasWorkspace } from "./state.ts";
import { awaitingWorkspace } from "../admin/consistency.ts";
import { removalDate } from "../billing/lifecycle.ts";

export type WorkspaceStatus =
  /** No workspace and nothing paid: the next step is to name and pay. */
  | { kind: "none" }
  /** Paid; the VPS is building it. `delayed` once the build has failed. */
  | { kind: "building"; username: string | null; delayed: boolean }
  /**
   * Up. `paid`: a subscription is current. Unpaid means no subscription at all
   * — the manual era, an admin's comp, or a still-running free week.
   */
  | { kind: "live"; username: string; address: string; paid: boolean; renewsAt: string | null }
  /** Up, but the last charge failed; it pauses when the grace runs out. */
  | { kind: "paymentDue"; username: string; address: string }
  /**
   * Cancelled. `over`: the paid period has already passed (the pause is due).
   * `canResubscribe`: Razorpay has ended it — while it is still `active` but
   * scheduled to end, a new subscription would be refused.
   */
  | { kind: "ending"; username: string; address: string; endsAt: string | null; over: boolean; canResubscribe: boolean }
  /**
   * Taken offline by the enforcer. `cause` says why in the person's terms;
   * `resuming`: they have paid since and the resume is on its way.
   */
  | {
      kind: "paused";
      username: string;
      cause: "payment" | "cancelled" | "trial";
      removeAfter: string | null;
      resuming: boolean;
    }
  /** A manual-era workspace whose free week ran out and was never paid. */
  | { kind: "trialEnded"; username: string; address: string };

type Profile = Pick<
  UserProfile,
  | "workspace_username"
  | "workspace_email"
  | "workspace_address"
  | "pendingWorkspaceUsername"
  | "billing"
  | "enforcement"
  | "trial"
>;

export function workspaceStatus(
  profile: Profile,
  provisioning: { status: string } | null = null,
  now: Date = new Date(),
): WorkspaceStatus {
  const billing = profile.billing;
  const live = hasWorkspace(profile as UserProfile);

  if (!live) {
    if (awaitingWorkspace(billing?.status, false)) {
      return {
        kind: "building",
        username: profile.pendingWorkspaceUsername,
        delayed: provisioning?.status === "failed",
      };
    }
    return { kind: "none" };
  }

  const username = profile.workspace_username!;
  const address = profile.workspace_address!;

  const endsAt = billing?.currentPeriodEnd ?? null;
  const periodOver = !endsAt || new Date(endsAt).getTime() <= now.getTime();

  if (profile.enforcement?.status === "suspended") {
    return {
      kind: "paused",
      username,
      cause:
        profile.enforcement.reason !== "payment"
          ? "trial"
          : billing?.status === "ended"
            ? "cancelled"
            : "payment",
      removeAfter: removalDate(profile.enforcement),
      resuming: billing?.status === "active" && !billing.cancelAtPeriodEnd,
    };
  }
  if (billing?.status === "pastDue") return { kind: "paymentDue", username, address };
  if (billing?.status === "ended") {
    return { kind: "ending", username, address, endsAt, over: periodOver, canResubscribe: true };
  }
  if (billing?.status === "active") {
    if (billing.cancelAtPeriodEnd) {
      return { kind: "ending", username, address, endsAt, over: periodOver, canResubscribe: false };
    }
    return { kind: "live", username, address, paid: true, renewsAt: endsAt };
  }
  // No paid subscription behind it: the manual era's promotional week.
  if (profile.trial && new Date(profile.trial.endsAt).getTime() <= now.getTime()) {
    return { kind: "trialEnded", username, address };
  }
  return { kind: "live", username, address, paid: false, renewsAt: null };
}
