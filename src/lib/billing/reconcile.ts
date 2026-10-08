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


/** What one reconciler run did — the route's response and the Needs-attention row. */
export type ReconcileSummary = {
  topups: Record<string, number>;
  refunds: Record<string, number>;
  subscriptions: { checked: number; applied: number; quiet: number; missing?: number };
  errors: string[];
  /**
   * Set when this run had to apply something a webhook should have, and no
   * webhook has passed the signature check for a while: the last verified
   * one's time, or "never". One cause instead of a flag per subscription.
   */
  webhookSilentSince?: string;
};

/** Longer than this without a verified webhook, while events go missing, means the webhook path is down. */
export const WEBHOOK_SILENT_AFTER_MS = 60 * 60_000;

/** The value for `webhookSilentSince`, or null when webhooks have arrived recently. */
export function webhookSilence(lastVerifiedAt: string | null, now: Date): string | null {
  if (!lastVerifiedAt) return "never";
  const at = Date.parse(lastVerifiedAt);
  if (!Number.isFinite(at)) return "never";
  return now.getTime() - at > WEBHOOK_SILENT_AFTER_MS ? lastVerifiedAt : null;
}

/** How many missed events this run applied (top-ups, automatic refunds, refunds, subscriptions). */
export function appliedCount(s: ReconcileSummary): number {
  return (s.topups.applied ?? 0) + (s.topups.refunded ?? 0) + (s.refunds.applied ?? 0) + s.subscriptions.applied;
}

/** The run, as a sentence for the Needs-attention list. */
export function describeRun(s: ReconcileSummary): string {
  const done: string[] = [];
  if (s.topups.applied) done.push(`${s.topups.applied} missed credit pack(s) applied`);
  if (s.topups.refunded) done.push(`${s.topups.refunded} credit pack(s) refunded automatically`);
  if (s.topups["refund-failed"]) done.push(`${s.topups["refund-failed"]} automatic refund(s) FAILED`);
  if (s.refunds.applied) done.push(`${s.refunds.applied} refund(s) applied`);
  if (s.subscriptions.applied) done.push(`${s.subscriptions.applied} missed subscription update(s) applied`);
  if (s.subscriptions.missing) done.push(`${s.subscriptions.missing} test-mode subscription(s) marked ended`);
  const cause = s.webhookSilentSince
    ? (s.webhookSilentSince === "never"
        ? "No verified Razorpay webhook is on record — "
        : `No Razorpay webhook has reached the site since ${s.webhookSilentSince} — `) +
      "check the live-mode webhook in Razorpay (URL must end in /api/billing/webhook/, enabled, secret = RAZORPAY_WEBHOOK_SECRET). "
    : "";
  const head = done.length ? `${cause}Billing check: ${done.join("; ")}.` : `${cause}Billing check:`;
  return s.errors.length
    ? `${head} ${s.errors.length} problem(s) — ${s.errors.join(" · ")}`
    : head;
}
