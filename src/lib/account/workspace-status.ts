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
import { complimentaryActive, removalDate } from "../billing/lifecycle.ts";
import { promoActive } from "../billing/promo.ts";
import type { PlanKey } from "../billing/plans.ts";

export type WorkspaceStatus =
  /** No workspace and nothing paid: the next step is to name and pay. */
  | { kind: "none" }
  /** Paid; the VPS is building it. `delayed` once the build has failed. */
  | { kind: "building"; username: string | null; delayed: boolean }
  /**
   * Up. `paid`: a subscription is current. Unpaid means no subscription at all
   * — the manual era, an admin's comp, or a still-running free week.
   */
  | {
      kind: "live";
      username: string;
      address: string;
      paid: boolean;
      renewsAt: string | null;
      /** Unpaid because a promotional month is running: when it ends. */
      promoEndsAt: string | null;
      /** Made complimentary by Allr: no payment needed (until a date, if any). */
      complimentary: { until: string | null } | null;
      /** The plan being paid for (paid only). */
      plan: PlanKey | null;
      /** A plan change set to take over at the renewal date. */
      switching: { plan: PlanKey; kind: "upgrade" | "downgrade"; startsAt: string | null } | null;
    }
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
  /** A free period (manual-era week or promotional month) ran out, unpaid. */
  | { kind: "trialEnded"; username: string; address: string; promo: boolean };

type Profile = Pick<
  UserProfile,
  | "workspace_username"
  | "workspace_email"
  | "workspace_address"
  | "pendingWorkspaceUsername"
  | "billing"
  | "enforcement"
  | "trial"
  | "promo"
  | "comp"
>;

export function workspaceStatus(
  profile: Profile,
  provisioning: { status: string } | null = null,
  now: Date = new Date(),
): WorkspaceStatus {
  const billing = profile.billing;
  const live = hasWorkspace(profile as UserProfile);

  if (!live) {
    if (awaitingWorkspace(billing?.status, false, promoActive(profile.promo, now))) {
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
  // Mid plan change: the old subscription ending is the handover, not a lapse.
  const switching =
    billing?.upcoming?.status === "authenticated"
      ? { plan: billing.upcoming.plan, kind: billing.upcoming.kind, startsAt: billing.upcoming.startsAt }
      : null;
  if (billing && switching && (billing.status === "active" || billing.status === "ended")) {
    return {
      kind: "live", username, address, paid: true, renewsAt: switching.startsAt ?? endsAt,
      promoEndsAt: null, complimentary: null, plan: billing.plan, switching,
    };
  }
  if (billing?.status === "ended") {
    return { kind: "ending", username, address, endsAt, over: periodOver, canResubscribe: true };
  }
  if (billing?.status === "active") {
    if (billing.cancelAtPeriodEnd) {
      return { kind: "ending", username, address, endsAt, over: periodOver, canResubscribe: false };
    }
    return {
      kind: "live", username, address, paid: true, renewsAt: endsAt, promoEndsAt: null, complimentary: null,
      plan: billing.plan, switching: null,
    };
  }
  // No paid subscription behind it: complimentary, a promotional month, or
  // the manual era's free week.
  if (complimentaryActive(profile.comp ?? null, now)) {
    return {
      kind: "live", username, address, paid: false, renewsAt: null, promoEndsAt: null,
      complimentary: { until: profile.comp!.until }, plan: null, switching: null,
    };
  }
  if (profile.promo && !promoActive(profile.promo, now)) {
    return { kind: "trialEnded", username, address, promo: true };
  }
  if (!profile.promo && profile.trial && new Date(profile.trial.endsAt).getTime() <= now.getTime()) {
    return { kind: "trialEnded", username, address, promo: false };
  }
  return {
    kind: "live",
    username,
    address,
    paid: false,
    renewsAt: null,
    promoEndsAt: promoActive(profile.promo, now) ? profile.promo!.endsAt : null,
    complimentary: null,
    plan: null,
    switching: null,
  };
}
