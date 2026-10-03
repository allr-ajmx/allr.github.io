/**
 * Promotional codes, pure: a code grants one free month of a workspace — no
 * payment details — with a smaller AI credit. After it, the workspace asks to
 * be paid for like any other (the lifecycle sweep treats it as a trial).
 *
 * Abuse limits live here so they are tested exactly as they run:
 * - each code has a use cap and an optional expiry, and can be switched off;
 * - one promo per email address, ever (the redemption is keyed by the email
 *   hash, so deleting the account and signing up again does not reset it);
 * - only for someone with no workspace and no live subscription.
 */

export const PROMO_DAYS_DEFAULT = 30;
export const PROMO_CREDIT_USD_DEFAULT = 5;
export const PROMO_MAX_DAYS = 90;
export const PROMO_MAX_CREDIT_USD = 50;
export const PROMO_MAX_USES = 10_000;

export type PromoCode = {
  code: string;
  active: boolean;
  maxUses: number;
  uses: number;
  /** ISO 8601, or null for no expiry. */
  expiresAt: string | null;
  days: number;
  creditUsd: number;
  note?: string;
};

/** What the account carries once redeemed. */
export type Promo = {
  code: string;
  redeemedAt: string;
  endsAt: string;
  creditUsd: number;
};

/** Codes are case-insensitive: A–Z, 0–9 and dashes, 3–32 characters. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{1,30}[A-Z0-9]$/.test(code) ? code : null;
}

export type RedeemInput = {
  code: PromoCode | null;
  alreadyRedeemed: boolean;
  hasWorkspace: boolean;
  billingStatus: string | null | undefined;
};

export type RedeemVerdict =
  | { ok: true }
  | { ok: false; reason: "unknown" | "inactive" | "expired" | "used-up" | "already" | "has-workspace" | "subscribed"; message: string };

export function redeemVerdict(i: RedeemInput, now: Date = new Date()): RedeemVerdict {
  const no = (reason: Extract<RedeemVerdict, { ok: false }>["reason"], message: string): RedeemVerdict => ({
    ok: false,
    reason,
    message,
  });
  if (i.hasWorkspace) return no("has-workspace", "You already have a workspace — codes are for getting started.");
  if (i.billingStatus === "active" || i.billingStatus === "pastDue") {
    return no("subscribed", "You already have a subscription.");
  }
  if (i.alreadyRedeemed) return no("already", "A promotional month has already been used with this email address.");
  const c = i.code;
  if (!c) return no("unknown", "That code isn’t valid.");
  if (!c.active) return no("inactive", "That code isn’t active any more.");
  if (c.expiresAt && Date.parse(c.expiresAt) <= now.getTime()) return no("expired", "That code has expired.");
  if (c.uses >= c.maxUses) return no("used-up", "That code has been fully used.");
  return { ok: true };
}

export function promoFor(c: PromoCode, now: Date = new Date()): Promo {
  return {
    code: c.code,
    redeemedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + c.days * 86_400_000).toISOString(),
    creditUsd: c.creditUsd,
  };
}

/** The free month is running. */
export function promoActive(p: Pick<Promo, "endsAt"> | null | undefined, now: Date = new Date()): boolean {
  return !!p?.endsAt && Date.parse(p.endsAt) > now.getTime();
}
