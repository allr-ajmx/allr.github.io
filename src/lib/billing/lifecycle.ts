/**
 * The lifecycle enforcer's brain — pure, so every boundary is testable.
 *
 * Billing truth → platform intent:
 *   paid up        → workspace runs; a billing-caused suspension is resumed
 *   pastDue        → GRACE_DAYS after the status flip, suspend (data kept)
 *   ended          → runs to the end of the paid period, then suspend
 *   suspended ≥ REMOVE_AFTER_DAYS for non-payment and still unpaid → remove
 *
 * Hard rules, in code not convention:
 * - Only `reason: "billing"` suspensions are ever resumed or removed here.
 *   An admin's manual suspension belongs to the admin.
 * - Removal exists ONLY for payment failure after a billing suspension ran
 *   its clock. Trial users who never subscribed are suspended at most.
 */

// .ts extension so Node can run this file directly in tests.
import { GRACE_DAYS } from "./model.ts";
import type { Billing } from "./model.ts";

export const REMOVE_AFTER_DAYS = 14;

/**
 * When a payment-suspended workspace becomes removable — derived from when it
 * was suspended, exactly as decide() does, never from the stored removeAfter
 * (written under whatever window applied at suspension time).
 */
export function removalDate(
  e: { reason?: string; suspendedAt?: string | null } | null | undefined,
): string | null {
  if (!e || e.reason !== "payment" || !e.suspendedAt) return null;
  const t = Date.parse(e.suspendedAt);
  return Number.isFinite(t) ? new Date(t + REMOVE_AFTER_DAYS * 86_400_000).toISOString() : null;
}

export type SuspendReason = "payment" | "trial";

export type Enforcement = {
  status: "suspended";
  reason: SuspendReason;
  suspendedAt: string; // ISO 8601
  /** ISO 8601, only for payment suspensions — when removal becomes due. */
  removeAfter: string | null;
} | null;

export type LifecycleInput = {
  hasWorkspace: boolean;
  billing: (Pick<Billing, "status" | "currentPeriodEnd"> & {
    /** ISO 8601 — when `status` last changed (statusSince). */
    statusSince: string | null;
  }) | null;
  trialEndsAt: string | null;
  enforcement: Enforcement;
};

export type LifecycleDecision =
  | { action: "none" }
  | { action: "suspend"; reason: string }
  | { action: "resume"; reason: string }
  | { action: "remove"; reason: string };

const DAY = 86_400_000;
const past = (iso: string | null | undefined, days: number, now: Date) =>
  !!iso && now.getTime() - new Date(iso).getTime() >= days * DAY;

export function decide(input: LifecycleInput, now: Date = new Date()): LifecycleDecision {
  if (!input.hasWorkspace) return { action: "none" };
  const b = input.billing;
  const e = input.enforcement;

  // Paid up: undo our own suspension (payment or trial), touch nothing else.
  if (b?.status === "active") {
    if (e) return { action: "resume", reason: "payment is current again" };
    return { action: "none" };
  }

  // Already suspended by us. The removal clock exists ONLY for payment
  // suspensions — a trial that never paid stays suspended, never deleted.
  if (e) {
    const unpaid = !b || b.status === "pastDue" || b.status === "ended";
    if (e.reason === "payment" && unpaid && past(e.suspendedAt, REMOVE_AFTER_DAYS, now)) {
      return {
        action: "remove",
        reason: `unpaid ${REMOVE_AFTER_DAYS}+ days after suspension`,
      };
    }
    return { action: "none" };
  }

  // Failing payment: grace runs from the moment the status flipped.
  if (b?.status === "pastDue" && past(b.statusSince, GRACE_DAYS, now)) {
    return { action: "suspend", reason: `payment failing ${GRACE_DAYS}+ days` };
  }

  // Cancelled/expired: they keep what they paid for, not a day more.
  if (b?.status === "ended") {
    const periodOver = b.currentPeriodEnd
      ? now.getTime() >= new Date(b.currentPeriodEnd).getTime()
      : past(b.statusSince, 0, now);
    if (periodOver) return { action: "suspend", reason: "subscription ended" };
    return { action: "none" };
  }

  // Never subscribed: trial over + grace → suspend. Never remove.
  if (!b || b.status === "pending") {
    if (input.trialEndsAt && past(input.trialEndsAt, GRACE_DAYS, now)) {
      return { action: "suspend", reason: `trial over ${GRACE_DAYS}+ days, no subscription` };
    }
  }

  return { action: "none" };
}

export function enforcementAfterSuspend(
  reason: SuspendReason,
  now: Date = new Date(),
): NonNullable<Enforcement> {
  return {
    status: "suspended",
    reason,
    suspendedAt: now.toISOString(),
    removeAfter:
      reason === "payment"
        ? new Date(now.getTime() + REMOVE_AFTER_DAYS * DAY).toISOString()
        : null,
  };
}
