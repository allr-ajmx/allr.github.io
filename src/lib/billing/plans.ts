/**
 * The plans, and the arithmetic of moving between them — pure, and the ONE
 * place prices and AI allowances live. Checkout, the billing core, /pricing
 * and the account pages all read from here.
 *
 * The workspace is one subscription. AI credit is a separate subscription
 * (any whole-dollar amount) plus one-time top-ups. `workspace_ai` remains
 * only so a subscription created before the split still decodes.
 *
 * Moving between them (the standard pattern):
 * - upgrade:   takes effect now; the price difference for the rest of the
 *              cycle is charged now and the same share of the AI allowance is
 *              granted until the renewal date; the billing date doesn't move.
 * - downgrade: takes effect at the renewal date; the allowance already paid
 *              for lasts until then. No refunds.
 */

import type { PlanCurrency } from "./model.ts";

export type PlanKey = "workspace" | "workspace_ai";

export type Plan = {
  key: PlanKey;
  name: string;
  /** Monthly AI allowance in USD (0: bring your own key). */
  aiUsd: number;
  price: Record<PlanCurrency, number>;
  display: Record<PlanCurrency, string>;
};

export const PLANS: Record<PlanKey, Plan> = {
  workspace: {
    key: "workspace",
    name: "Workspace",
    aiUsd: 0,
    price: { USD: 10_00, INR: 899_00 },
    display: { USD: "$10", INR: "₹899" },
  },
  workspace_ai: {
    key: "workspace_ai",
    name: "Workspace + AI",
    aiUsd: 20,
    price: { USD: 30_00, INR: 2_698_00 },
    display: { USD: "$30", INR: "₹2,698" },
  },
};

export const PLAN_KEYS: readonly PlanKey[] = ["workspace", "workspace_ai"];
/**
 * The workspace's list price. New checkouts are priced from this in USD and
 * converted at the day's rate (quote.ts); `price.INR` above is only for
 * subscriptions made before that.
 */
export const WORKSPACE_USD = PLANS.workspace.price.USD / 100;
export const PLAN_INTERVAL = "month";
/** Documents written before `plan` existed. New checkouts use `workspace`. */
export const LEGACY_PLAN: PlanKey = "workspace_ai";

/** Suggested monthly AI credit at checkout. Not an included allowance. */
export const CREDIT_PRESET_USD = 20;
/** Smallest monthly AI credit subscription. Unticked checkout sends 0. */
export const CREDIT_MIN_USD = 1;
/**
 * Paise charged per $1 of AI credit. Same rate as the workspace:
 * ₹899 / $10 = ₹89.90.
 */
export const INR_PAISE_PER_USD = 8_990;

export function creditAmountMinor(usd: number, currency: PlanCurrency): number {
  const dollars = Math.max(0, Math.round(usd));
  return currency === "USD" ? dollars * 100 : dollars * INR_PAISE_PER_USD;
}

/** 0, or a whole number of dollars at least CREDIT_MIN_USD. */
export function parseCreditUsd(raw: unknown): number | null {
  if (raw === 0 || raw === "0" || raw === null || raw === undefined || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < CREDIT_MIN_USD) return null;
  return n;
}

export const isPlanKey = (v: unknown): v is PlanKey => v === "workspace" || v === "workspace_ai";

/** Below this (minor units) an upgrade's share isn't worth a charge: none is made. */
export const MIN_PRORATION_MINOR = 100;

export type Proration = {
  /** Share of the current cycle still ahead, 0..1. */
  fraction: number;
  /** Charged now, minor units (0 when below the minimum). */
  chargeMinor: number;
  /** AI credit granted now, until the renewal date (USD). */
  creditUsd: number;
};

/**
 * The prorated difference for an upgrade made at `now` inside a cycle
 * [start, end). Downgrades are never prorated (they wait for the renewal).
 */
export function prorate(
  from: PlanKey,
  to: PlanKey,
  currency: PlanCurrency,
  periodStart: Date,
  periodEnd: Date,
  now: Date,
): Proration {
  const total = periodEnd.getTime() - periodStart.getTime();
  const left = periodEnd.getTime() - now.getTime();
  const fraction = total > 0 ? Math.min(1, Math.max(0, left / total)) : 0;
  const diff = PLANS[to].price[currency] - PLANS[from].price[currency];
  const raw = diff > 0 ? Math.round(diff * fraction) : 0;
  const chargeMinor = raw >= MIN_PRORATION_MINOR ? raw : 0;
  const aiDiff = PLANS[to].aiUsd - PLANS[from].aiUsd;
  const creditUsd = chargeMinor > 0 && aiDiff > 0 ? Math.round(aiDiff * fraction * 100) / 100 : 0;
  return { fraction, chargeMinor, creditUsd };
}

export type ChangeKind = "upgrade" | "downgrade";
export const changeKind = (from: PlanKey, to: PlanKey): ChangeKind | null =>
  from === to ? null : PLANS[to].price.USD > PLANS[from].price.USD ? "upgrade" : "downgrade";
