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
