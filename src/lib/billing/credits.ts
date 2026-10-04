/**
 * The credit ledger, pure. One OpenRouter key per workspace carries a single
 * cumulative limit (`purchasedUsd`). Available credit is purchased minus
 * cumulative usage. Monthly refills and top-ups add to purchased and roll
 * over in full; nothing expires.
 *
 * `INCLUDED_USD` remains only so a ledger written before this split — which
 * stored an included monthly pot and no `purchasedUsd` — still loads as the
 * balance the person already had.
 *
 * Invariants:
 * - usage (U) only grows; the key never resets (limit_reset: none).
 * - The key's limit is `purchasedUsd` (targetOf), never a monthly cap.
 * - available = max(0, purchasedUsd − usage).
 */

/** Historical monthly allowance. Not granted on new workspace charges. */
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
  | { type: "set_included"; usd: number }
  /** A credit pack was refunded: take back what is left of it, never below zero. */
  | { type: "refund_topup"; usd: number };

export type CreditLedger = {
  /**
   * Every dollar added (monthly refills, top-ups, grants). The OpenRouter
   * key's cumulative limit. Available is this minus `usageUsd`.
   */
  purchasedUsd: number;
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
    purchasedUsd: 0,
    includedUsd: 0,
    includedLeftUsd: 0,
    cycleStartUsageUsd: 0,
    topupBalanceUsd: 0,
    grants: [],
    targetLimitUsd: 0,
    usageUsd: 0,
    usageSyncedAt: null,
    grantsPending: 0,
    pending: [],
  };
}

/** The limit the key should hold: total purchased, which usage counts against. */
export function targetOf(l: CreditLedger): number {
  return round2(Math.max(0, l.purchasedUsd));
}

/** What the person can still spend. */
export function availableUsd(l: CreditLedger, usage = l.usageUsd): number {
  return round2(Math.max(0, l.purchasedUsd - Math.max(0, usage)));
}

/** Monthly refill, top-up, or grant. Rolls into the same balance. */
export function addPurchased(l: CreditLedger, usd: number): CreditLedger {
  const purchasedUsd = round2(l.purchasedUsd + Math.max(0, usd));
  return withTarget({ ...l, purchasedUsd });
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
  const available = availableUsd(preview);
  return {
    availableUsd: available,
    includedUsd: available,
    grantsUsd: 0,
    topupUsd: 0,
    grants: [] as CreditGrant[],
  };
}

/** A purchased pack: face value, added to the same balance immediately. */
export function applyTopup(l: CreditLedger, packUsd: number): CreditLedger {
  const next = addPurchased(l, packUsd);
  return { ...next, topupBalanceUsd: round2(l.topupBalanceUsd + Math.max(0, packUsd)) };
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
export function settle(l: CreditLedger, liveUsageUsd: number, _now: Date = new Date()): CreditLedger {
  const usage = round2(Math.max(l.usageUsd, liveUsageUsd));
  let purchased = l.purchasedUsd;
  let topup = l.topupBalanceUsd;
  for (const change of l.pending ?? []) {
    if (change.type === "grant" || (change.type === "set_included" && change.usd > 0)) {
      const usd = change.type === "grant" ? change.grant.usd : change.usd;
      purchased = round2(purchased + Math.max(0, usd));
    } else if (change.type === "refund_topup") {
      const take = Math.max(0, change.usd);
      const unspent = Math.max(0, round2(purchased - usage));
      const cut = Math.min(take, unspent);
      purchased = round2(purchased - cut);
      topup = round2(Math.max(0, topup - cut));
    }
  }
  return withTarget({
    ...l,
    usageUsd: usage,
    purchasedUsd: purchased,
    topupBalanceUsd: topup,
    pending: [],
    grantsPending: 0,
  });
}

/**
 * The workspace (and its OpenRouter key) was removed. The next workspace gets
 * a NEW key whose usage starts at zero, so the ledger is rebased onto it:
 * purchased packs and unexpired grants carry over as what was left of them;
 * the monthly included credit belonged to the ended subscription and goes
 * (a new subscription's first charge grants it afresh). Queued changes and
 * pending charges are kept for the next settlement.
 */
export function forNewKey(l: CreditLedger, now: Date = new Date()): CreditLedger {
  const settled = settle(l, l.usageUsd, now);
  const left = availableUsd(settled);
  return withTarget({
    ...settled,
    usageUsd: 0,
    cycleStartUsageUsd: 0,
    usageSyncedAt: null,
    purchasedUsd: left,
    topupBalanceUsd: left,
    includedUsd: 0,
    includedLeftUsd: 0,
    grants: [],
  });
}

/** Firestore's stored shape → a ledger; tolerant of every older shape. */
export function ledgerFromDoc(raw: Record<string, unknown> | null | undefined): CreditLedger | null {
  if (!raw) return null;
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const includedUsd = n(raw.includedUsd, raw.purchasedUsd == null ? INCLUDED_USD : 0);
  const hasLeft = raw.includedLeftUsd !== undefined && raw.includedLeftUsd !== null;
  const includedLeftUsd = hasLeft ? n(raw.includedLeftUsd, includedUsd) : includedUsd;
  const grants = Array.isArray(raw.grants) ? (raw.grants as CreditGrant[]) : [];
  const topupBalanceUsd = n(raw.topupBalanceUsd, 0);
  const cycleStartUsageUsd = n(raw.cycleStartUsageUsd, 0);
  // A ledger from before purchasedUsd: the old key limit was the cap, which
  // is exactly usage-so-far plus what was still available.
  const legacyCap = round2(
    cycleStartUsageUsd + includedLeftUsd + sum(grants.map((g) => g.usd)) + topupBalanceUsd,
  );
  const purchasedUsd = raw.purchasedUsd == null ? legacyCap : n(raw.purchasedUsd, 0);
  return {
    purchasedUsd,
    includedUsd,
    ...(hasLeft ? { includedLeftUsd } : {}),
    cycleStartUsageUsd,
    topupBalanceUsd,
    grants,
    targetLimitUsd: purchasedUsd,
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
 * Top-up packs: price per plan currency in minor units. The credit is the
 * face price — tax is added on the payment screen, not taken out of the credit.
 */
export const PACK_FEE_SHARE = 0;
const creditFor = (priceUsd: number) => round2(priceUsd);

export const TOPUP_PACKS = [
  { id: "s", priceUsd: 10, creditUsd: creditFor(10), price: { USD: 10_00, INR: 899_00 }, display: { USD: "$10", INR: "₹899" } },
  { id: "m", priceUsd: 25, creditUsd: creditFor(25), price: { USD: 25_00, INR: 2_199_00 }, display: { USD: "$25", INR: "₹2,199" } },
  { id: "l", priceUsd: 50, creditUsd: creditFor(50), price: { USD: 50_00, INR: 4_299_00 }, display: { USD: "$50", INR: "₹4,299" } },
  { id: "xl", priceUsd: 100, creditUsd: creditFor(100), price: { USD: 100_00, INR: 8_499_00 }, display: { USD: "$100", INR: "₹8,499" } },
] as const;

export type TopupPackId = (typeof TOPUP_PACKS)[number]["id"];

export const packById = (id: unknown) =>
  TOPUP_PACKS.find((p) => p.id === id) ?? null;
