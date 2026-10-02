import "server-only";

import { ApiError } from "./errors";

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

export function planIdFor(currency: "USD" | "INR"): string {
  const id =
    currency === "INR"
      ? process.env.RAZORPAY_PLAN_ID_INR
      : process.env.RAZORPAY_PLAN_ID_USD;
  if (!id) {
    throw new ApiError(
      503,
      "billing-unconfigured",
      "Billing is not set up for your region yet.",
    );
  }
  return id;
}

async function rzp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

  const body = (await res.json().catch(() => null)) as
    | (T & { error?: { code?: string; description?: string } })
    | null;

  if (!res.ok || !body) {
    console.error("[razorpay]", path, res.status, body?.error);
    throw new ApiError(
      502,
      "billing-upstream",
      "Our payment provider had a problem. Nothing was charged — try again in a moment.",
    );
  }
  return body;
}

export type RzpCustomer = { id: string };
export type RzpSubscription = {
  id: string;
  status: string;
  plan_id: string;
  customer_id?: string;
  current_end?: number | null;
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
      // The webhook maps events back to a person through this, not through
      // email — addresses change hands, uids do not.
      notes: { uid },
    }),
  });

export const fetchSubscription = (id: string) =>
  rzp<RzpSubscription>(`/subscriptions/${id}`);

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
  order_id?: string | null;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
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
export const refundPayment = (paymentId: string) =>
  rzp<{ id: string; amount: number; status: string }>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({}),
  });
