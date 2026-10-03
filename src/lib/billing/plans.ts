/**
 * The plans, and the arithmetic of moving between them — pure, and the ONE
 * place prices and AI allowances live. Checkout, the billing core, /pricing
 * and the account pages all read from here.
 *
 * Two plans, one subscription each:
 * - workspace     — the workspace only; the person brings their own AI key
 *                   (the Keys page in their workspace), our key sits at $0.
 * - workspace_ai  — the workspace plus a monthly AI allowance that expires at
 *                   the end of each billing cycle.
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
export const PLAN_INTERVAL = "month";
/** Subscriptions made before there were two plans were all Workspace + AI. */
export const LEGACY_PLAN: PlanKey = "workspace_ai";

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
