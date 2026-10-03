/**
 * Money-back and reconciliation rules for one-off payments, pure.
 * (Subscription state is decided by the billing core, src/lib/billing/core.ts.)
 */

/**
 * The AI credit to take back for a refund on a credit pack: proportional to
 * the money refunded (a partial refund takes back part), never more than the
 * pack gave, rounded to cents.
 */
export function creditToRevoke(packCreditUsd: number, paymentAmountMinor: number, refundedMinor: number): number {
  if (!(paymentAmountMinor > 0) || !(refundedMinor > 0)) return 0;
  const share = Math.min(1, refundedMinor / paymentAmountMinor);
  return Math.round(packCreditUsd * share * 100) / 100;
}

/** Payments worth a top-up look: one-off order payments, not subscription charges. */
export function isOrderPayment(p: { order_id?: string | null; invoice_id?: string | null }): boolean {
  return Boolean(p.order_id) && !p.invoice_id;
}

