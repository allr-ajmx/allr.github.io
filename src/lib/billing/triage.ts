/**
 * Which webhooks we can't act on, and which of those an admin must see.
 * Pure, so the rules are tested exactly as they run.
 *
 * "record" = money or a person is involved and we couldn't match it: it goes
 * to billing_events (the Operations feed) so it can be reconciled by hand.
 * Events we simply don't handle (payment.authorized, invoice.*, a normal
 * subscription payment arriving as payment.captured) are noise, not loss.
 */

export type Triage =
  | { act: true }
  | { act: false; record: boolean; reason: string };

type SubLike = { id?: string; notes?: Record<string, unknown> | null } | undefined;

export function triageSubscriptionEvent(eventName: string, subscription: SubLike): Triage {
  if (!eventName.startsWith("subscription.")) {
    return { act: false, record: false, reason: `unhandled event ${eventName || "(none)"}` };
  }
  if (!subscription?.id) {
    return { act: false, record: true, reason: "subscription event without a subscription entity" };
  }
  const uid = subscription.notes?.uid;
  if (typeof uid !== "string" || !uid.trim()) {
    return { act: false, record: true, reason: "subscription carries no uid note" };
  }
  return { act: true };
}

type OrderNotes = Record<string, unknown> | null | undefined;

export function triageTopup(order: { notes?: OrderNotes }): Triage {
  if (order.notes?.kind !== "topup") {
    return { act: false, record: false, reason: "not a top-up order" };
  }
  const uid = order.notes.uid;
  const credit = Number(order.notes.credit_usd);
  if (typeof uid !== "string" || !uid.trim()) {
    return { act: false, record: true, reason: "top-up order carries no uid note" };
  }
  if (!Number.isFinite(credit) || credit <= 0) {
    return { act: false, record: true, reason: "top-up order has no valid credit_usd note" };
  }
  return { act: true };
}
