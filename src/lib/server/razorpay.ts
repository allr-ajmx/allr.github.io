import "server-only";

import { ApiError } from "./errors";
import { isMissingRefusal, retryAfterMs } from "@/lib/billing/razorpay-errors";
import type { PlanKey } from "@/lib/billing/plans";

/**
 * The slice of Razorpay's REST API this product uses — nothing more. Plain
 * fetch with basic auth; the official SDK would add a dependency to wrap the
 * same three calls.
 */

const BASE = "https://api.razorpay.com/v1";

export function razorpayKeyId(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  if (!id) throw new ApiError(503, "billing-unconfigured", "Billing is not set up yet.");
  return id;
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) {
    throw new ApiError(503, "billing-unconfigured", "Billing is not set up yet.");
  }
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

/**
 * Razorpay plan ids, per plan and currency. Workspace + AI keeps the original
 * variable names (RAZORPAY_PLAN_ID_USD / _INR) so existing env still works;
 * the _AI_ names win when set.
 */
const PLAN_ENV: Record<PlanKey, Record<"USD" | "INR", string[]>> = {
  workspace_ai: {
    USD: ["RAZORPAY_PLAN_ID_AI_USD", "RAZORPAY_PLAN_ID_USD"],
    INR: ["RAZORPAY_PLAN_ID_AI_INR", "RAZORPAY_PLAN_ID_INR"],
  },
  workspace: {
    USD: ["RAZORPAY_PLAN_ID_WORKSPACE_USD"],
    INR: ["RAZORPAY_PLAN_ID_WORKSPACE_INR"],
  },
};

const envPlanId = (plan: PlanKey, currency: "USD" | "INR") =>
  PLAN_ENV[plan][currency].map((k) => process.env[k]).find((v): v is string => Boolean(v));

/** The $1 / ₹89.90 plan. Checkout sets quantity to the dollar amount. */
export function creditUnitPlanId(currency: "USD" | "INR"): string {
  const id = currency === "INR" ? process.env.RAZORPAY_PLAN_ID_CREDIT_INR : process.env.RAZORPAY_PLAN_ID_CREDIT_USD;
  if (!id) throw new ApiError(503, "billing-unconfigured", "Billing is not set up yet.");
  return id;
}

export function planIdFor(currency: "USD" | "INR", plan: PlanKey = "workspace_ai"): string {
  const id = envPlanId(plan, currency);
  if (!id) {
    throw new ApiError(503, "billing-unconfigured", "That plan isn't available in your region yet.");
  }
  return id;
}

/** Which plan (and currency) a Razorpay plan id is, or null if it's none of ours. */
export function planOf(
  planId: string | undefined,
  notes?: Record<string, string> | null,
): { plan: PlanKey; currency: "USD" | "INR" } | null {
  // A priced-at-checkout plan (server/pricing.ts) is known by its notes.
  if (notes?.kind === "workspace" && (notes.currency === "USD" || notes.currency === "INR")) {
    return { plan: "workspace", currency: notes.currency };
  }
  if (!planId) return null;
  for (const plan of ["workspace_ai", "workspace"] as PlanKey[]) {
    for (const currency of ["USD", "INR"] as const) {
      if (envPlanId(plan, currency) === planId) return { plan, currency };
    }
  }
  return null;
}

async function rzp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = () =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        ...init.headers,
      },
      // Razorpay is a dependency that can be down; a hung socket must not hold
      // a serverless function open until the platform kills it.
      signal: AbortSignal.timeout(15_000),
    });
  let res = await send();
  // Rate-limited: a read is retried once, shortly. Writes are never resent
  // here — their callers decide, since a write may have half-happened.
  if (res.status === 429 && (init.method ?? "GET").toUpperCase() === "GET") {
    await new Promise((r) => setTimeout(r, retryAfterMs(res.headers.get("retry-after"))));
    res = await send();
  }

  const body = (await res.json().catch(() => null)) as
    | (T & { error?: { code?: string; description?: string } })
    | null;

  if (!res.ok || !body) {
    console.error("[razorpay]", path, res.status, body?.error);
    throw new RazorpayError(res.status, body?.error?.code ?? "", body?.error?.description ?? "");
  }
  return body;
}

/**
 * What Razorpay refused, kept so callers can tell "this id doesn't exist here"
 * (e.g. a test-mode subscription now that the keys are live) from an outage.
 * Still a 502 to the browser, with the same calm message.
 */
export class RazorpayError extends ApiError {
  readonly upstreamStatus: number;
  readonly upstreamCode: string;
  readonly description: string;
  constructor(upstreamStatus: number, upstreamCode: string, description: string) {
    super(502, "billing-upstream", "Our payment provider had a problem. Nothing was charged — try again in a moment.");
    this.upstreamStatus = upstreamStatus;
    this.upstreamCode = upstreamCode;
    this.description = description;
  }
}

/** Razorpay says the id isn't known — in this mode (test vs live) or at all. */
export function isMissingOnRazorpay(e: unknown): boolean {
  return e instanceof RazorpayError && isMissingRefusal(e.upstreamStatus, e.description);
}

export type RzpCustomer = { id: string };
export type RzpSubscription = {
  id: string;
  status: string;
  plan_id: string;
  customer_id?: string;
  current_start?: number | null;
  current_end?: number | null;
  /** How many charges have succeeded — the monthly-grant idempotency key. */
  paid_count?: number | null;
  notes?: Record<string, string>;
};

/** `fail_existing: "0"` returns the existing customer for this email instead of erroring. */
export const createCustomer = (name: string, email: string) =>
  rzp<RzpCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: name || email, email, fail_existing: "0" }),
  });

export const createSubscription = (
  planId: string,
  customerId: string,
  uid: string,
  extra: {
    /** Unix seconds: start later (a plan change at the renewal date). */
    startAt?: number;
    /** Monthly AI credit: a $1 plan times this many dollars. */
    quantity?: number;
    /** Charged with the authorisation (an upgrade's prorated difference). */
    upfront?: { name: string; amountMinor: number; currency: "USD" | "INR" };
    notes?: Record<string, string>;
  } = {},
) =>
  rzp<RzpSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      customer_id: customerId,
      // Razorpay requires a horizon; 120 monthly cycles = ten years, i.e.
      // "until cancelled" for any horizon this product plans on.
      total_count: 120,
      customer_notify: 1,
      ...(extra.quantity && extra.quantity > 1 ? { quantity: extra.quantity } : {}),
      ...(extra.startAt ? { start_at: extra.startAt } : {}),
      ...(extra.upfront
        ? { addons: [{ item: { name: extra.upfront.name, amount: extra.upfront.amountMinor, currency: extra.upfront.currency } }] }
        : {}),
      // The webhook maps events back to a person through this, not through
      // email — addresses change hands, uids do not.
      notes: { uid, ...(extra.notes ?? {}) },
    }),
  });

export type RzpPlan = { id: string };

/**
 * A monthly plan for one exact amount. Checkout prices a subscription per
 * person (dollar lines, the day's rate, GST), so plans are made on demand and
 * cached by amount (see server/pricing.ts) rather than set up by hand.
 */
export const createPlan = (amountMinor: number, currency: "USD" | "INR", name: string, notes: Record<string, string> = {}) =>
  rzp<RzpPlan>("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: { name: name.slice(0, 255), amount: amountMinor, currency },
      notes,
    }),
  });

export const fetchSubscription = (id: string) =>
  rzp<RzpSubscription>(`/subscriptions/${id}`);

/** The subscription, or null when Razorpay has no such id (left over from test mode). */
export async function fetchSubscriptionOrMissing(id: string): Promise<RzpSubscription | null> {
  try {
    return await fetchSubscription(id);
  } catch (e) {
    if (isMissingOnRazorpay(e)) return null;
    throw e;
  }
}

export const cancelSubscriptionAtCycleEnd = (id: string) =>
  rzp<RzpSubscription>(`/subscriptions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });

export type RzpOrder = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
};

/** One-time order (credit top-ups). Notes carry uid + credit for the webhook. */
export const createOrder = (
  amountMinor: number,
  currency: "USD" | "INR",
  notes: Record<string, string>,
) =>
  rzp<RzpOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: amountMinor, currency, notes }),
  });

export const fetchOrder = (id: string) => rzp<RzpOrder>(`/orders/${id}`);

export type RzpPayment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  order_id?: string | null;
  invoice_id?: string | null;
  amount_refunded?: number;
  email?: string | null;
  created_at?: number;
  notes?: Record<string, string> | unknown[];
};

/** Cancel immediately (not at cycle end) — used when the workspace itself is going away. */
export const cancelSubscriptionNow = (id: string) =>
  rzp<RzpSubscription>(`/subscriptions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: 0 }),
  });

export type RzpInvoice = {
  id: string;
  status: string;
  payment_id?: string | null;
  paid_at?: number | null;
  amount_paid?: number;
  amount?: number;
  currency?: string;
  date?: number | null;
  short_url?: string | null;
  billing_start?: number | null;
  billing_end?: number | null;
};

/** A subscription's invoices (newest charges first after sorting by the caller). */
export async function listSubscriptionInvoices(subscriptionId: string): Promise<RzpInvoice[]> {
  const list = await rzp<{ items?: RzpInvoice[] }>(
    `/invoices?subscription_id=${encodeURIComponent(subscriptionId)}&count=50`,
  );
  return list.items ?? [];
}

/** The most recent paid charge of a subscription, if any. */
export async function lastPaidPayment(subscriptionId: string): Promise<{ paymentId: string; amount: number } | null> {
  const list = await rzp<{ items?: RzpInvoice[] }>(
    `/invoices?subscription_id=${encodeURIComponent(subscriptionId)}&count=20`,
  );
  const paid = (list.items ?? [])
    .filter((i) => i.status === "paid" && i.payment_id)
    .sort((a, b) => (b.paid_at ?? 0) - (a.paid_at ?? 0))[0];
  return paid ? { paymentId: paid.payment_id!, amount: paid.amount_paid ?? 0 } : null;
}

export const fetchPayment = (id: string) =>
  rzp<{ id: string; amount: number; amount_refunded?: number; status: string }>(`/payments/${id}`);

/** Full refund of one payment. Razorpay refuses a second refund once nothing is left to refund. */
/** Notes mark it as ours, so the refund webhook / reconciler doesn't flag it. */
export const refundPayment = (paymentId: string, reason = "admin") =>
  rzp<{ id: string; amount: number; status: string }>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ notes: { by: "allr", reason } }),
  });

/** Payments created in [from, to] (unix seconds), newest first, one page. */
export const listPayments = (from: number, to: number, skip = 0) =>
  rzp<{ items?: RzpPayment[] }>(`/payments?from=${from}&to=${to}&count=100&skip=${skip}`);

export type RzpRefund = {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at?: number;
  notes?: Record<string, string> | unknown[];
};

/** Refunds created in [from, to] (unix seconds), one page. */
export const listRefunds = (from: number, to: number, skip = 0) =>
  rzp<{ items?: RzpRefund[] }>(`/refunds?from=${from}&to=${to}&count=100&skip=${skip}`);

/** Capture an authorized payment for its full amount. */
export const capturePayment = (id: string, amount: number, currency: string) =>
  rzp<RzpPayment>(`/payments/${id}/capture`, {
    method: "POST",
    body: JSON.stringify({ amount, currency }),
  });
