/**
 * Promotional codes, pure. Two kinds:
 * - free_month: a free period of a workspace — no payment details — with a
 *   smaller AI credit. After it, the workspace asks to be paid for like any
 *   other (the lifecycle sweep treats it as a trial).
 * - waive_workspace: the workspace fee is waived for N months (or for good);
 *   they subscribe to a fixed monthly AI credit only. The subscription ends
 *   after the waived months, and they subscribe again at the full price.
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
export const WAIVE_CREDIT_USD_DEFAULT = 20;
export const WAIVE_MAX_MONTHS = 36;
export const WAIVE_MAX_CREDIT_USD = 500;

export type PromoKind = "free_month" | "waive_workspace";
export const isPromoKind = (v: unknown): v is PromoKind => v === "free_month" || v === "waive_workspace";

export type PromoCode = {
  code: string;
  /** Codes made before kinds existed are free_month. */
  kind: PromoKind;
  active: boolean;
  maxUses: number;
  uses: number;
  /** ISO 8601, or null for no expiry. */
  expiresAt: string | null;
  /** free_month: the free days. */
  days: number;
  /** free_month: the free credit. waive_workspace: the monthly credit they pay for. */
  creditUsd: number;
  /** waive_workspace: months without the workspace fee; null for no end. */
  waiveMonths: number | null;
  note?: string;
};

/** What the account carries once redeemed. */
export type Promo = {
  code: string;
  redeemedAt: string;
  endsAt: string;
  creditUsd: number;
};

/**
 * What the account carries once a waive_workspace code is redeemed: the
 * terms its checkout will be priced with.
 */
export type Waiver = {
  code: string;
  redeemedAt: string;
  /** Monthly AI credit the subscription carries (USD). */
  creditUsd: number;
  /** Paid months without the workspace fee; null for no end. */
  months: number | null;
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

export function waiverFor(c: PromoCode, now: Date = new Date()): Waiver {
  return { code: c.code, redeemedAt: now.toISOString(), creditUsd: c.creditUsd, months: c.waiveMonths };
}

/**
 * When a waived subscription's last waived month ends: known once its final
 * waived month is paid (null before then, and for a waiver with no end).
 */
export function waiverEndsAt(
  b: { waived: { months: number | null } | null; paidCount: number | null; currentPeriodEnd: string | null } | null | undefined,
): string | null {
  const months = b?.waived?.months;
  if (!months || (b!.paidCount ?? 0) < months) return null;
  return b!.currentPeriodEnd;
}

/**
 * The waiver still prices the next checkout: until a subscription made with
 * it has been paid for. An abandoned checkout doesn't spend it; a paid one
 * does, so subscribing again after the waived months is at the full price.
 */
export function waiverApplies(
  waiver: Waiver | null | undefined,
  billing: { waived?: unknown; paidCount?: number | null } | null | undefined,
): waiver is Waiver {
  if (!waiver) return false;
  return !(billing?.waived && (billing.paidCount ?? 0) > 0);
}
