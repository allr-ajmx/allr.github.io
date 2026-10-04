/**
 * Stored records → typed values: ONE decoder per record, used by every reader
 * (the profile API, the billing core, the admin views). Every field of the
 * type is required here, so adding a field to the type without decoding it is
 * a compile error — not a page that silently never sees it (which happened
 * twice: cancelAtPeriodEnd, then paidCount).
 *
 * Decoders tolerate every older shape and never produce `undefined`, so a
 * value read and written back is always a valid Firestore value.
 */

import type { Billing, BillingStatus, CreditSubscription, CreditUpcoming, PlanCurrency, UpcomingChange } from "./model.ts";
import { LEGACY_PLAN, isPlanKey } from "./plans.ts";
import type { Promo } from "./promo.ts";
import type { Complimentary, Enforcement } from "./lifecycle.ts";

type Raw = Record<string, unknown> | null | undefined;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
/** Firestore Timestamp or ISO string → ISO string ("" when absent). */
const isoOf = (v: unknown): string => {
  if (typeof v === "string") return v;
  const d = (v as { toDate?: () => Date } | null)?.toDate?.();
  return d instanceof Date ? d.toISOString() : "";
};

const STATUSES: readonly BillingStatus[] = ["pending", "active", "pastDue", "ended"];

export function billingFromDoc(raw: Raw): Billing | null {
  if (!raw || typeof raw.subscriptionId !== "string" || !raw.subscriptionId) return null;
  const status = STATUSES.includes(raw.status as BillingStatus) ? (raw.status as BillingStatus) : "pending";
  return {
    status,
    planCurrency: raw.planCurrency === "INR" ? "INR" : ("USD" as PlanCurrency),
    subscriptionId: raw.subscriptionId,
    customerId: str(raw.customerId) ?? "",
    currentPeriodEnd: str(raw.currentPeriodEnd),
    providerStatus: str(raw.providerStatus) ?? "",
    statusSince: str(raw.statusSince),
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd === true,
    paidCount: num(raw.paidCount),
    plan: isPlanKey(raw.plan) ? raw.plan : LEGACY_PLAN,
    currentPeriodStart: str(raw.currentPeriodStart),
    upcoming: upcomingFromDoc(raw.upcoming as Raw),
    updatedAt: isoOf(raw.updatedAt),
  };
}

export function upcomingFromDoc(raw: Raw): UpcomingChange | null {
  if (!raw || !str(raw.subscriptionId) || !isPlanKey(raw.plan)) return null;
  return {
    subscriptionId: str(raw.subscriptionId)!,
    plan: raw.plan,
    kind: raw.kind === "downgrade" ? "downgrade" : "upgrade",
    status: raw.status === "authenticated" ? "authenticated" : "created",
    startsAt: str(raw.startsAt),
    chargeMinor: num(raw.chargeMinor) ?? 0,
    creditUsd: num(raw.creditUsd) ?? 0,
    creditGranted: raw.creditGranted === true,
    oldCancelled: raw.oldCancelled === true,
  };
}

export function creditSubscriptionFromDoc(raw: Raw): CreditSubscription | null {
  if (!raw || typeof raw.subscriptionId !== "string" || !raw.subscriptionId) return null;
  const status = STATUSES.includes(raw.status as BillingStatus) ? (raw.status as BillingStatus) : "pending";
  const amount = num(raw.amountUsd);
  return {
    status,
    currency: raw.currency === "INR" ? "INR" : "USD",
    amountUsd: amount ?? 0,
    subscriptionId: raw.subscriptionId,
    customerId: str(raw.customerId) ?? "",
    currentPeriodEnd: str(raw.currentPeriodEnd),
    currentPeriodStart: str(raw.currentPeriodStart),
    providerStatus: str(raw.providerStatus) ?? "",
    statusSince: str(raw.statusSince),
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd === true,
    paidCount: num(raw.paidCount),
    upcoming: creditUpcomingFromDoc(raw.upcoming as Raw),
    updatedAt: isoOf(raw.updatedAt),
  };
}

export function creditUpcomingFromDoc(raw: Raw): CreditUpcoming | null {
  if (!raw || !str(raw.subscriptionId)) return null;
  return {
    subscriptionId: str(raw.subscriptionId)!,
    amountUsd: num(raw.amountUsd) ?? 0,
    status: raw.status === "authenticated" ? "authenticated" : "created",
    startsAt: str(raw.startsAt),
    oldCancelled: raw.oldCancelled === true,
  };
}

export function promoFromDoc(raw: Raw): Promo | null {
  if (!raw || !str(raw.endsAt)) return null;
  return {
    code: str(raw.code) ?? "",
    redeemedAt: str(raw.redeemedAt) ?? "",
    endsAt: str(raw.endsAt)!,
    creditUsd: num(raw.creditUsd) ?? 0,
  };
}

export function enforcementFromDoc(raw: Raw): Enforcement {
  if (!raw || raw.status !== "suspended") return null;
  return {
    status: "suspended",
    reason: raw.reason === "payment" ? "payment" : "trial",
    suspendedAt: str(raw.suspendedAt) ?? "",
    removeAfter: str(raw.removeAfter),
  };
}

export function compFromDoc(raw: Raw): Complimentary {
  if (!raw || typeof raw !== "object") return null;
  return {
    until: str(raw.until),
    note: str(raw.note) ?? "",
    by: str(raw.by) ?? "",
    at: isoOf(raw.at),
  };
}
