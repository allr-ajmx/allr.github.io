/**
 * The credit ledger, pure. One OpenRouter key per workspace carries a single
 * cumulative limit; every bucket below is bookkeeping done here and applied
 * as "set the limit to X" by the VPS worker.
 *
 * Buckets, in the order spend draws them:
 *   1. included   — the monthly grant (default $20), expires at the cycle end
 *   2. grants     — admin credit, each with its own expiry, soonest first
 *   3. packs      — purchased top-ups, never expire
 *
 * Invariants:
 * - usage (U) only grows; the key never resets (limit_reset: none).
 * - The key's limit is cycleStart + includedLeft + Σgrants + packs
 *   (targetOf) — always recomputed, never accumulated.
 * - Any change that would re-attribute past spend (a monthly reset, a new or
 *   revoked grant, an expiry, a changed monthly amount) is QUEUED and applied
 *   by settle() against LIVE usage read by the worker: settle first rebases
 *   every bucket to what is genuinely left at U, then applies the changes. So
 *   no snapshot staleness and no retroactive accounting can cost anyone.
 * - Packs are the last bucket, so a purchase applies immediately and safely.
 */

export const INCLUDED_USD = 20;

export type CreditGrant = {
  id: string;
  /** Unspent amount as of the ledger's cycleStart baseline. */
  usd: number;
  /** ISO 8601; null = never expires. */
  expiresAt: string | null;
  note?: string;
};

export type PendingChange =
  | { type: "grant"; grant: CreditGrant }
  | { type: "revoke"; id: string }
  | { type: "set_included"; usd: number };

export type CreditLedger = {
  /** This customer's monthly grant — INCLUDED_USD unless an admin changed it. */
  includedUsd: number;
  /** Included budget available from cycleStart (≤ includedUsd after a rebase). */
  includedLeftUsd?: number;
  /** Cumulative usage at the start of the current accounting baseline. */
  cycleStartUsageUsd: number;
  /** Purchased credit still unconsumed as of the baseline. */
  topupBalanceUsd: number;
  grants?: CreditGrant[];
  /** The limit the workspace's key should currently have. */
  targetLimitUsd: number;
  /** Last usage snapshot pushed by the platform (cumulative). */
  usageUsd: number;
  /** ISO 8601 of that snapshot; null before the first push. */
  usageSyncedAt: string | null;
  /** Monthly charges recorded but not yet settled against live usage. */
  grantsPending?: number;
  /** Structural changes awaiting settlement against live usage. */
  pending?: PendingChange[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

const includedLeft = (l: CreditLedger) => l.includedLeftUsd ?? l.includedUsd ?? INCLUDED_USD;
const grantsOf = (l: CreditLedger) => l.grants ?? [];

/** Soonest expiry first; never-expiring last; stable by id. */
function byExpiry(a: CreditGrant, b: CreditGrant): number {
  const ax = a.expiresAt ? Date.parse(a.expiresAt) : Infinity;
  const bx = b.expiresAt ? Date.parse(b.expiresAt) : Infinity;
  return ax - bx || a.id.localeCompare(b.id);
}

export function initialLedger(): CreditLedger {
  return {
    includedUsd: INCLUDED_USD,
    includedLeftUsd: INCLUDED_USD,
    cycleStartUsageUsd: 0,
    topupBalanceUsd: 0,
    grants: [],
    targetLimitUsd: INCLUDED_USD,
    usageUsd: 0,
    usageSyncedAt: null,
    grantsPending: 0,
    pending: [],
  };
}

/** The limit the key should hold: derived, never accumulated. */
export function targetOf(l: CreditLedger): number {
  return round2(
    l.cycleStartUsageUsd + includedLeft(l) + sum(grantsOf(l).map((g) => g.usd)) + l.topupBalanceUsd,
  );
}

const withTarget = (l: CreditLedger): CreditLedger => ({ ...l, targetLimitUsd: targetOf(l) });

/** Spend since the baseline, per the given (or snapshot) usage. */
export function spentThisCycle(l: CreditLedger, usage = l.usageUsd): number {
  return round2(Math.max(0, usage - l.cycleStartUsageUsd));
}

/** What is left in each bucket at usage U, spend drawn in bucket order. */
export function pools(l: CreditLedger, usage = l.usageUsd) {
  let spend = spentThisCycle(l, usage);
  const draw = (have: number) => {
    const used = Math.min(have, spend);
    spend = round2(spend - used);
    return round2(have - used);
  };
  const included = draw(includedLeft(l));
  const grants = [...grantsOf(l)].sort(byExpiry).map((g) => ({ ...g, usd: draw(g.usd) }));
  const topup = draw(l.topupBalanceUsd);
  return { included, grants, topup };
}

/**
 * What the person and the admin see: the ledger as it will be once queued
 * changes settle (previewed at the snapshot), then what is left of each bucket.
 */
export function remaining(l: CreditLedger, now: Date = new Date()) {
  const preview = settle(l, l.usageUsd, now);
  const p = pools(preview, preview.usageUsd);
  return {
    includedUsd: p.included,
    grantsUsd: sum(p.grants.map((g) => g.usd)),
    topupUsd: p.topup,
    grants: p.grants.filter((g) => g.usd > 0),
  };
}

/** A purchased pack: the last bucket, so it lands immediately and safely. */
export function applyTopup(l: CreditLedger, packUsd: number): CreditLedger {
  return withTarget({ ...l, topupBalanceUsd: round2(l.topupBalanceUsd + packUsd) });
}

/** The monthly charge succeeded — recorded only; settle() does the work. */
export function applyMonthlyGrant(l: CreditLedger): CreditLedger {
  return { ...l, grantsPending: (l.grantsPending ?? 0) + 1 };
}

/** Queue a structural change for settlement against live usage. */
export function queueChange(l: CreditLedger, change: PendingChange): CreditLedger {
  return { ...l, pending: [...(l.pending ?? []), change] };
}

/** True when some grant has expired and settlement would drop it. */
export function hasExpiredGrant(l: CreditLedger, now: Date = new Date()): boolean {
  return grantsOf(l).some((g) => g.expiresAt && Date.parse(g.expiresAt) <= now.getTime());
}

/**
 * Settle against LIVE cumulative usage. First rebase: every bucket becomes
 * what is genuinely left at U, the baseline moves to U, and expired or
 * spent-out grants fall away. Then the monthly reset (unspent included
 * expires; a fresh month's grant starts) and the queued changes, in order.
 */
export function settle(l: CreditLedger, liveUsageUsd: number, now: Date = new Date()): CreditLedger {
  const usage = round2(Math.max(l.usageUsd, liveUsageUsd));
  const p = pools(l, usage);
  let next: CreditLedger = {
    ...l,
    usageUsd: usage,
    cycleStartUsageUsd: usage,
    includedLeftUsd: p.included,
    topupBalanceUsd: p.topup,
    grants: p.grants.filter(
      (g) => g.usd > 0 && !(g.expiresAt && Date.parse(g.expiresAt) <= now.getTime()),
    ),
  };

  if ((l.grantsPending ?? 0) > 0) {
    next = { ...next, includedLeftUsd: next.includedUsd ?? INCLUDED_USD, grantsPending: 0 };
  }

  for (const change of l.pending ?? []) {
    if (change.type === "grant") {
      next = { ...next, grants: [...grantsOf(next), change.grant] };
    } else if (change.type === "revoke") {
      next = { ...next, grants: grantsOf(next).filter((g) => g.id !== change.id) };
    } else {
      // Raising helps this month at once; lowering trims this month's
      // remainder, never below zero.
      const prev = next.includedUsd ?? INCLUDED_USD;
      const usd = Math.max(0, round2(change.usd));
      next = {
        ...next,
        includedUsd: usd,
        includedLeftUsd: Math.max(0, round2(includedLeft(next) + (usd - prev))),
      };
    }
  }

  return withTarget({ ...next, pending: [] });
}

/** Firestore's stored shape → a ledger; tolerant of every older shape. */
export function ledgerFromDoc(raw: Record<string, unknown> | null | undefined): CreditLedger | null {
  if (!raw) return null;
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    includedUsd: n(raw.includedUsd, INCLUDED_USD),
    includedLeftUsd: raw.includedLeftUsd === undefined ? undefined : n(raw.includedLeftUsd, INCLUDED_USD),
    cycleStartUsageUsd: n(raw.cycleStartUsageUsd, 0),
    topupBalanceUsd: n(raw.topupBalanceUsd, 0),
    grants: Array.isArray(raw.grants) ? (raw.grants as CreditGrant[]) : [],
    targetLimitUsd: n(raw.targetLimitUsd, INCLUDED_USD),
    usageUsd: n(raw.usageUsd, 0),
    usageSyncedAt: typeof raw.usageSyncedAt === "string" ? raw.usageSyncedAt : null,
    grantsPending: n(raw.grantsPending, 0),
    pending: Array.isArray(raw.pending) ? (raw.pending as PendingChange[]) : [],
  };
}

/** A fresher usage snapshot; usage never goes backwards. */
export function applyUsage(l: CreditLedger, usageUsd: number, at: string): CreditLedger {
  return { ...l, usageUsd: round2(Math.max(l.usageUsd, usageUsd)), usageSyncedAt: at };
}

/** What the key limit is actually set to: never below what is already spent. */
export function appliedLimit(l: CreditLedger, liveUsageUsd: number): number {
  return round2(Math.max(targetOf(l), liveUsageUsd));
}

/**
 * Top-up packs: price per plan currency in minor units, and the AI credit (USD)
 * it buys. Credit is the price less PACK_FEE_SHARE — what OpenRouter (~5.5% on
 * funding) and Razorpay (~2–3% + GST) take — so every pack breaks even.
 */
export const PACK_FEE_SHARE = 0.08;
const creditFor = (priceUsd: number) => round2(priceUsd * (1 - PACK_FEE_SHARE));

export const TOPUP_PACKS = [
  { id: "s", priceUsd: 10, creditUsd: creditFor(10), price: { USD: 10_00, INR: 899_00 }, display: { USD: "$10", INR: "₹899" } },
  { id: "m", priceUsd: 25, creditUsd: creditFor(25), price: { USD: 25_00, INR: 2_199_00 }, display: { USD: "$25", INR: "₹2,199" } },
  { id: "l", priceUsd: 50, creditUsd: creditFor(50), price: { USD: 50_00, INR: 4_299_00 }, display: { USD: "$50", INR: "₹4,299" } },
  { id: "xl", priceUsd: 100, creditUsd: creditFor(100), price: { USD: 100_00, INR: 8_499_00 }, display: { USD: "$100", INR: "₹8,499" } },
] as const;

export type TopupPackId = (typeof TOPUP_PACKS)[number]["id"];

export const packById = (id: unknown) =>
  TOPUP_PACKS.find((p) => p.id === id) ?? null;
