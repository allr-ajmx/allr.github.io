/**
 * The credit ledger, pure. One OpenRouter key per workspace carries a single
 * cumulative limit; everything two-bucket about it (included resets monthly,
 * top-ups carry) is bookkeeping done here and applied as "set the limit to X".
 *
 * Invariants:
 * - usage (U) only grows; the key never resets (limit_reset: none).
 * - Within a cycle, spend draws the included grant first, then top-ups.
 * - At each monthly charge: unspent included expires, top-ups roll over,
 *   and the new limit is U + included + topupBalance.
 */

export const INCLUDED_USD = 20;

export type CreditLedger = {
  /** This customer's monthly grant — INCLUDED_USD unless an admin changed it. */
  includedUsd: number;
  /** Cumulative usage at the start of the current cycle. */
  cycleStartUsageUsd: number;
  /** Purchased credit still unconsumed. */
  topupBalanceUsd: number;
  /** The limit the workspace's key should currently have. */
  targetLimitUsd: number;
  /** Last usage snapshot pushed by the platform (cumulative). */
  usageUsd: number;
  /** ISO 8601 of that snapshot; null before the first push. */
  usageSyncedAt: string | null;
};

export function initialLedger(): CreditLedger {
  return {
    includedUsd: INCLUDED_USD,
    cycleStartUsageUsd: 0,
    topupBalanceUsd: 0,
    targetLimitUsd: INCLUDED_USD,
    usageUsd: 0,
    usageSyncedAt: null,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Spend since the cycle began, per the latest snapshot. */
export function spentThisCycle(l: CreditLedger): number {
  return round2(Math.max(0, l.usageUsd - l.cycleStartUsageUsd));
}

/** What the person sees: included remaining, then top-up remaining. */
export function remaining(l: CreditLedger): { includedUsd: number; topupUsd: number } {
  const spent = spentThisCycle(l);
  const grant = l.includedUsd ?? INCLUDED_USD;
  const includedUsd = round2(Math.max(0, grant - spent));
  const topupSpent = Math.max(0, spent - grant);
  return { includedUsd, topupUsd: round2(Math.max(0, l.topupBalanceUsd - topupSpent)) };
}

/** A purchased pack lands immediately: balance and limit both grow. */
export function applyTopup(l: CreditLedger, packUsd: number): CreditLedger {
  return {
    ...l,
    topupBalanceUsd: round2(l.topupBalanceUsd + packUsd),
    targetLimitUsd: round2(l.targetLimitUsd + packUsd),
  };
}

/**
 * The monthly charge succeeded: settle the old cycle against the latest
 * snapshot, expire unspent included credit, carry the top-ups, grant anew.
 */
export function applyMonthlyGrant(l: CreditLedger): CreditLedger {
  const { topupUsd } = remaining(l);
  return {
    ...l,
    cycleStartUsageUsd: l.usageUsd,
    topupBalanceUsd: topupUsd,
    targetLimitUsd: round2(l.usageUsd + (l.includedUsd ?? INCLUDED_USD) + topupUsd),
  };
}

/** A fresher usage snapshot; usage never goes backwards. */
export function applyUsage(l: CreditLedger, usageUsd: number, at: string): CreditLedger {
  return {
    ...l,
    usageUsd: round2(Math.max(l.usageUsd, usageUsd)),
    usageSyncedAt: at,
  };
}

/**
 * An admin changes this customer's monthly grant. The delta lands on the
 * current cycle too (raising it mid-month helps immediately; lowering it
 * never claws back below what is already spent).
 */
export function setIncluded(l: CreditLedger, includedUsd: number): CreditLedger {
  const prev = l.includedUsd ?? INCLUDED_USD;
  const next = Math.max(0, round2(includedUsd));
  const target = Math.max(l.usageUsd, round2(l.targetLimitUsd + (next - prev)));
  return { ...l, includedUsd: next, targetLimitUsd: target };
}

/** Top-up packs: credit value in USD, price per plan currency in minor units. */
export const TOPUP_PACKS = [
  { id: "s", creditUsd: 10, price: { USD: 10_00, INR: 899_00 }, display: { USD: "$10", INR: "₹899" } },
  { id: "m", creditUsd: 25, price: { USD: 25_00, INR: 2_199_00 }, display: { USD: "$25", INR: "₹2,199" } },
  { id: "l", creditUsd: 50, price: { USD: 50_00, INR: 4_299_00 }, display: { USD: "$50", INR: "₹4,299" } },
] as const;

export type TopupPackId = (typeof TOPUP_PACKS)[number]["id"];

export const packById = (id: unknown) =>
  TOPUP_PACKS.find((p) => p.id === id) ?? null;
