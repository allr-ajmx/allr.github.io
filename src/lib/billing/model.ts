/**
 * Billing, as both halves see it.
 *
 * The workspace is the plan (DESIGN.md §16): one subscription, monthly.
 * Razorpay settles in INR and Indian customers must be charged in INR, so
 * there are two siblings of the same plan — USD for everyone else, INR for
 * `country === "IN"` — chosen from the profile, never asked.
 */

export type PlanCurrency = "USD" | "INR";

// Prices and plans live in plans.ts (PLANS); this file is the shapes.
export { PLAN_INTERVAL } from "./plans.ts";
import type { PlanKey } from "./plans.ts";

/** Days after the trial lapses before the workspace is suspended (manually, for now). */
export const GRACE_DAYS = 2;

export function planCurrencyFor(country: string): PlanCurrency {
  return country?.trim().toUpperCase() === "IN" ? "INR" : "USD";
}

/**
 * What Razorpay told us last, normalised to the handful of states the product
 * cares about. Webhooks write it; nothing in the browser can.
 */
export type BillingStatus =
  /** Checkout opened but no charge has succeeded yet. */
  | "pending"
  /** Paid up: the mandate is live and the current period is covered. */
  | "active"
  /** A charge failed and Razorpay is retrying, or gave up. Fixable by the person. */
  | "pastDue"
  /** Ended: cancelled by them, completed its term, or expired unpaid. */
  | "ended";

/**
 * A plan change in flight. Razorpay can't change a UPI/e-mandate subscription
 * in place, so a change is a NEW subscription on the new plan that starts at
 * the current renewal date; this records it until it takes over.
 */
export type UpcomingChange = {
  subscriptionId: string;
  plan: PlanKey;
  kind: "upgrade" | "downgrade";
  /** "created": checkout opened; "authenticated": mandate set, waiting to start. */
  status: "created" | "authenticated";
  /** ISO 8601 — when it takes over (the current renewal date). */
  startsAt: string | null;
  /** Upgrade only: charged now as an upfront amount, and AI credit granted now. */
  chargeMinor: number;
  creditUsd: number;
  creditGranted: boolean;
  /** The current subscription has been told to end at the renewal date. */
  oldCancelled: boolean;
};

export type Billing = {
  status: BillingStatus;
  planCurrency: PlanCurrency;
  subscriptionId: string;
  customerId: string;
  /** ISO 8601 — end of the period the last successful charge covered, if known. */
  currentPeriodEnd: string | null;
  /** The raw Razorpay subscription status behind `status`, for debugging. */
  providerStatus: string;
  /** ISO 8601 — when `status` last changed. The grace clock runs from here. */
  statusSince: string | null;
  /**
   * The person cancelled; it ends at currentPeriodEnd. Razorpay keeps the
   * subscription `active` until then, so this flag is the only record of it.
   * Belongs to `subscriptionId` — a different subscription starts it false.
   */
  cancelAtPeriodEnd: boolean;
  /** Razorpay's paid_count as last recorded: a month is granted once per increase. */
  paidCount: number | null;
  /** Which plan this subscription is for. */
  plan: PlanKey;
  /** ISO 8601 — start of the current paid cycle, if known (proration needs it). */
  currentPeriodStart: string | null;
  /** A plan change waiting for its start (a new subscription), or null. */
  upcoming: UpcomingChange | null;
  /** ISO 8601. */
  updatedAt: string;
};

/** Where self-serve provisioning stands, straight off the queue. */
export type ProvisioningStatus = {
  status: "queued" | "claimed" | "provisioned" | "failed" | "released";
  error: string | null;
};

/** What GET /api/account/billing returns. */
export type BillingSummary = {
  billing: Billing | null;
  /** The current plan's price (or the default plan's, before subscribing). */
  plan: { key: PlanKey; name: string; aiUsd: number; currency: PlanCurrency; amountMinor: number; display: string; interval: string };
  /** Every plan, in the person's currency, for choosing and switching. */
  plans: { key: PlanKey; name: string; aiUsd: number; amountMinor: number; display: string }[];
  /** Paying is the gate now; kept for the UI's benefit. */
  canSubscribe: boolean;
  hasWorkspace: boolean;
  /** The name their workspace will get, reserved before checkout. */
  pendingUsername: string | null;
  provisioning: ProvisioningStatus | null;
};

/** What POST /api/account/billing/subscribe returns. */
export type SubscribeResponse = {
  subscriptionId: string;
  keyId: string;
  plan: BillingSummary["plan"];
};

/**
 * Razorpay subscription statuses → ours. `created`/`authenticated` mean the
 * mandate exists but no money has moved; `pending` and `halted` both mean a
 * charge is failing, differing only in whether Razorpay is still retrying.
 */
export function normalizeProviderStatus(provider: string): BillingStatus {
  switch (provider) {
    case "active":
    case "resumed":
      return "active";
    case "pending":
    case "halted":
    case "paused":
      return "pastDue";
    case "cancelled":
    case "completed":
    case "expired":
      return "ended";
    default:
      return "pending";
  }
}
