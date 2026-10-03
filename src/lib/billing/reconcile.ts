/**
 * Reconciliation and money-event rules, pure. Webhooks are the fast path; a
 * periodic pull from Razorpay is the safety net that applies whatever a
 * webhook missed. Both paths go through the same appliers, so every rule that
 * makes a second application harmless lives here and is tested.
 */

/** Razorpay subscription statuses → the webhook event that would report them. */
const EVENT_FOR_STATUS: Record<string, string> = {
  authenticated: "subscription.authenticated",
  active: "subscription.activated",
  pending: "subscription.pending",
  halted: "subscription.halted",
  paused: "subscription.paused",
  cancelled: "subscription.cancelled",
  completed: "subscription.completed",
  expired: "subscription.completed",
};

export type StoredSub = { providerStatus?: string | null; paidCount?: number | null; currentPeriodEnd?: string | null };
export type LiveSub = { status: string; paid_count?: number | null; current_end?: number | null };

/**
 * What a reconcile pass should apply for a subscription, or null when our
 * record already matches Razorpay. A charge we never heard about (paid_count
 * moved past the count we last GRANTED for) is reported as
 * `subscription.charged`, which grants the month — but only when we have a
 * recorded count to compare with; an older record without one is never
 * guessed at (its next real charge sets it).
 */
export function missedSubscriptionEvent(stored: StoredSub, live: LiveSub): string | null {
  const paid = live.paid_count ?? null;
  if (paid !== null && stored.paidCount !== null && stored.paidCount !== undefined && paid > stored.paidCount) {
    return "subscription.charged";
  }
  const periodEnd = live.current_end ? new Date(live.current_end * 1000).toISOString() : null;
  const statusChanged = (stored.providerStatus ?? null) !== live.status;
  const periodMoved = periodEnd !== null && periodEnd !== (stored.currentPeriodEnd ?? null);
  if (!statusChanged && !periodMoved) return null;
  return EVENT_FOR_STATUS[live.status] ?? null;
}

/**
 * Does this charge event grant a month? Once per paid_count, whichever path
 * (webhook or reconcile) sees it first. The stored count is the count last
 * GRANTED for — only a granting charge advances it (an activation carrying
 * the same count must not, or the charge right after it would be skipped).
 * With no counts to compare (older records, odd payloads), grant on the
 * event, as before.
 */
export function grantsMonth(eventName: string, storedPaidCount: number | null | undefined, livePaidCount: number | null | undefined): boolean {
  if (eventName !== "subscription.charged") return false;
  if (livePaidCount === null || livePaidCount === undefined) return true;
  if (storedPaidCount === null || storedPaidCount === undefined) return true;
  return livePaidCount > storedPaidCount;
}

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

/** The granted-for count to store after an event. Only a granting charge moves it. */
export function nextPaidCount(granted: boolean, stored: number | null | undefined, live: number | null | undefined): number | null {
  if (!granted) return stored ?? null;
  if (live === null || live === undefined) return (stored ?? 0) + 1;
  return Math.max(live, stored ?? 0);
}
