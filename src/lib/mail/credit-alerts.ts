/**
 * When to tell someone their AI credit is low, or gone — pure.
 *
 * Decided wherever live usage lands (the worker's usage push, the limit
 * sync), against the ledger as it stands. Each alert goes out once per
 * balance: `basisUsd` is the purchased total when it fired, and any credit
 * added since (a pack, a monthly charge) re-arms both.
 */

export type CreditAlerts = {
  /** ISO 8601 — when "running low" went out for this balance. */
  lowAt: string | null;
  /** ISO 8601 — when "used up" went out for this balance. */
  outAt: string | null;
  /** purchasedUsd when the last alert fired; more than this means credit was added. */
  basisUsd: number;
};

/** "Low" is this share of what was bought … */
export const LOW_FRACTION = 0.15;
/** … but never less than this many dollars. */
export const LOW_MIN_USD = 1;
/** At or under this, the key has effectively nothing left to spend. */
export const OUT_USD = 0.05;

export type CreditAlertDecision = {
  send: "low" | "out" | null;
  /** What to store as `users.creditAlerts` (null clears it). */
  next: CreditAlerts | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function creditAlert(
  ledger: { purchasedUsd: number; usageUsd: number },
  prior: CreditAlerts | null | undefined,
  now: Date = new Date(),
): CreditAlertDecision {
  const purchased = round2(Math.max(0, ledger.purchasedUsd));
  // Nothing bought (their own key, or not yet): nothing to run out of.
  if (purchased <= 0) return { send: null, next: null };
  // Credit added since the last alert: start over.
  const armed = prior && purchased <= prior.basisUsd + 0.005 ? prior : null;
  const available = round2(Math.max(0, purchased - Math.max(0, ledger.usageUsd)));
  const at = now.toISOString();

  if (available <= OUT_USD) {
    if (armed?.outAt) return { send: null, next: armed };
    return { send: "out", next: { lowAt: armed?.lowAt ?? at, outAt: at, basisUsd: purchased } };
  }
  const lowLine = Math.max(LOW_MIN_USD, round2(LOW_FRACTION * purchased));
  // "Low" needs something spent: a $1 balance nobody has touched isn't running low.
  if (available <= lowLine && available < purchased) {
    if (armed?.lowAt) return { send: null, next: armed };
    return { send: "low", next: { lowAt: at, outAt: null, basisUsd: purchased } };
  }
  return { send: null, next: armed };
}

/** What is still available, as the alert would say it. */
export function availableOf(ledger: { purchasedUsd: number; usageUsd: number }): number {
  return round2(Math.max(0, Math.max(0, ledger.purchasedUsd) - Math.max(0, ledger.usageUsd)));
}

export function creditAlertsFromDoc(raw: unknown): CreditAlerts | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const basis = Number(r.basisUsd);
  if (!Number.isFinite(basis)) return null;
  return {
    lowAt: typeof r.lowAt === "string" && r.lowAt ? r.lowAt : null,
    outAt: typeof r.outAt === "string" && r.outAt ? r.outAt : null,
    basisUsd: basis,
  };
}
