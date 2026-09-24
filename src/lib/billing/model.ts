/**
 * Billing, as both halves see it.
 *
 * The workspace is the plan (DESIGN.md §16): one subscription, monthly.
 * Razorpay settles in INR and Indian customers must be charged in INR, so
 * there are two siblings of the same plan — USD for everyone else, INR for
 * `country === "IN"` — chosen from the profile, never asked.
 */

export type PlanCurrency = "USD" | "INR";

/** Amounts in the currency's smallest unit, as Razorpay wants them. */
export const PLAN_PRICING: Record<
  PlanCurrency,
  { amountMinor: number; display: string }
> = {
  USD: { amountMinor: 30_00, display: "$30" },
  INR: { amountMinor: 2_499_00, display: "₹2,499" },
};

export const PLAN_INTERVAL = "month";

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

export type Billing = {
  status: BillingStatus;
  planCurrency: PlanCurrency;
  subscriptionId: string;
  customerId: string;
  /** ISO 8601 — end of the period the last successful charge covered, if known. */
  currentPeriodEnd: string | null;
  /** The raw Razorpay subscription status behind `status`, for debugging. */
  providerStatus: string;
  /** ISO 8601. */
  updatedAt: string;
};

/** What GET /api/account/billing returns. */
export type BillingSummary = {
  billing: Billing | null;
  plan: { currency: PlanCurrency; amountMinor: number; display: string; interval: string };
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
