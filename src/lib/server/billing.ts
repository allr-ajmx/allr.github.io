import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import { reserveUsername } from "./provisioning";
import { readOrAdoptProfile } from "./profiles";
import type { Caller } from "./session";
import { readQueue } from "./provisioning";
import { shipLog } from "./logship";
import { syncSubscription } from "./subscriptions";
import {
  cancelSubscriptionNow,
  fetchPayment,
  fetchSubscriptionOrMissing,
  isMissingOnRazorpay,
  lastPaidPayment,
  refundPayment,
  cancelSubscriptionAtCycleEnd,
  createCustomer,
  createSubscription,
  creditUnitPlanId,
  planIdFor,
  razorpayKeyId,
} from "./razorpay";
import {
  PLAN_INTERVAL,
  planCurrencyFor,
  type Billing,
  type BillingSummary,
  type CreditSubscribeResponse,
  type PlanCurrency,
  type SubscribeResponse,
} from "@/lib/billing/model";
import {
  PLANS,
  PLAN_KEYS,
  changeKind,
  creditAmountMinor,
  isPlanKey,
  parseCreditUsd,
  prorate,
  type PlanKey,
} from "@/lib/billing/plans";
import { creditSubscriptionFromDoc } from "@/lib/billing/records";
import { hasWorkspace } from "@/lib/account/state";
import type { UserProfile } from "@/lib/account/model";

const USERS = "users";
/** One document per delivered webhook, so redelivery cannot double-apply. */
const EVENTS = "billing_events";
/** Razorpay subscription statuses that can never charge again. */
const TERMINAL = new Set(["cancelled", "completed", "expired"]);

const iso = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : null;

export function readBilling(profile: UserProfile): Billing | null {
  return profile.billing ?? null;
}

/** A plan as the person sees it, in their currency. */
export function planView(key: PlanKey, currency: PlanCurrency) {
  const p = PLANS[key];
  return {
    key,
    name: p.name,
    aiUsd: p.aiUsd,
    currency,
    amountMinor: p.price[currency],
    display: p.display[currency],
    interval: PLAN_INTERVAL,
  };
}

export async function summarize(profile: UserProfile): Promise<BillingSummary> {
  // A subscriber pays in the currency their subscription was made in.
  const currency = profile.billing?.planCurrency ?? planCurrencyFor(profile.country);
  const workspace = hasWorkspace(profile);
  const current: PlanKey =
    profile.billing && profile.billing.status !== "ended" ? profile.billing.plan : "workspace";
  return {
    billing: readBilling(profile),
    creditSubscription: profile.creditSubscription,
    pendingCreditUsd: profile.pendingCreditUsd,
    // Paying is the gate now; the workspace is what payment buys.
    canSubscribe: true,
    hasWorkspace: workspace,
    pendingUsername: profile.pendingWorkspaceUsername,
    provisioning:
      !workspace && (profile.billing || profile.promo) ? await readQueue(profile.uid) : null,
    plan: planView(current, currency),
    plans: PLAN_KEYS.map((k) => {
      const v = planView(k, currency);
      return { key: v.key, name: v.name, aiUsd: v.aiUsd, amountMinor: v.amountMinor, display: v.display };
    }),
  };
}

/**
 * Create (or resume) the caller's subscription and hand back what Checkout
 * needs. Idempotent by construction: an unpaid subscription that already
 * exists is returned rather than duplicated, so an abandoned checkout does
 * not strand a second mandate.
 */
export async function startSubscription(
  caller: Caller,
  requestedUsername?: unknown,
  requestedCredit: unknown = 0,
): Promise<SubscribeResponse> {
  const creditUsd = parseCreditUsd(requestedCredit);
  if (creditUsd === null) {
    throw badRequest("bad-credit", "Monthly AI credit is a whole number of dollars, at least $1, or none.");
  }
  const planKey: PlanKey = "workspace";
  let profile = await readOrAdoptProfile(caller);
  if (!profile) throw badRequest("no-profile", "Make an account first.");

  // Paying is the gate. An account without a workspace must bring the name
  // its workspace will get; reserving it here means checkout can only be
  // opened for a name that is actually theirs.
  if (!hasWorkspace(profile)) {
    if (requestedUsername !== undefined || !profile.pendingWorkspaceUsername) {
      await reserveUsername(caller, requestedUsername ?? profile.pendingWorkspaceUsername);
      profile = (await readOrAdoptProfile(caller))!;
    }
  }

  const currency = planCurrencyFor(profile.country);
  const plan = planView(planKey, currency);

  const existing = profile.billing;
  if (existing) {
    if (existing.status === "active") {
      throw conflict("already-subscribed", "Your workspace is already paid for.");
    }
    // A checkout that was opened and abandoned, or a mandate that is failing:
    // the same subscription is the one to finish or fix.
    if (existing.status === "pending" || existing.status === "pastDue") {
      // Bring our record up to Razorpay's present state first. A checkout
      // that was in fact paid (the webhook never told us) is applied — and
      // flagged as a miss — rather than reopened for money already taken; one
      // Razorpay doesn't know (a test-mode leftover) ends, and we start afresh.
      await syncSubscription(existing.subscriptionId, { source: "reconcile", uidHint: caller.uid });
      const now = (await readOrAdoptProfile(caller))?.billing;
      if (now?.subscriptionId === existing.subscriptionId) {
        if (now.status === "active") {
          throw conflict("already-subscribed", "Your payment went through — your workspace is on its way.");
        }
        // A failing mandate is fixed on its own plan; an abandoned checkout is
        // reused only for the same plan (choosing another starts a new one).
        if (now.status === "pastDue" || (now.status === "pending" && now.plan === planKey)) {
          return { subscriptionId: now.subscriptionId, keyId: razorpayKeyId(), plan, pendingCreditUsd: creditUsd };
        }
      }
    }
  }

  // One checkout at a time per account: two clicks (or two tabs) at once
  // would otherwise each create a Razorpay subscription.
  const lock = adminDb().collection("billing_locks").doc(caller.uid);
  await adminDb().runTransaction(async (tx) => {
    const held = await tx.get(lock);
    const at = held.data()?.at?.toMillis?.() ?? 0;
    if (held.exists && Date.now() - at < 60_000) {
      throw conflict("checkout-busy", "Checkout is already opening — give it a moment.");
    }
    tx.set(lock, { at: FieldValue.serverTimestamp() });
  });
  try {
    const customer = await createCustomer(profile.name, caller.email);
    const sub = await createSubscription(planIdFor(currency, planKey), customer.id, caller.uid, {
      notes: { kind: "workspace" },
    });
    await adminDb().collection(USERS).doc(caller.uid).update({ pending_credit_usd: creditUsd });
    await syncSubscription(sub.id, { source: "checkout", uidHint: caller.uid, planCurrency: currency }, sub);
    shipLog("billing", "subscription created", { email: caller.email, currency, sub: sub.id, creditUsd });
    return { subscriptionId: sub.id, keyId: razorpayKeyId(), plan, pendingCreditUsd: creditUsd };
  } finally {
    await lock.delete().catch(() => {});
  }
}

/**
 * Start or replace the monthly AI-credit subscription. The workspace
 * subscription must already be active. A new amount replaces the current
 * credit subscription at its renewal date so the account keeps one.
 */
export async function startCreditSubscription(caller: Caller, requested: unknown): Promise<CreditSubscribeResponse> {
  const amountUsd = parseCreditUsd(requested);
  if (amountUsd === null || amountUsd < 1) {
    throw badRequest("bad-credit", "Monthly AI credit is a whole number of dollars, at least $1.");
  }
  const profile = await readOrAdoptProfile(caller);
  const billing = profile?.billing;
  if (!profile || !billing || billing.status !== "active") {
    throw badRequest("workspace-first", "Subscribe to a workspace before adding monthly AI credit.");
  }
  if (billing.cancelAtPeriodEnd) {
    throw conflict("cancelled", "Your workspace subscription is cancelled. Once it ends, subscribe again.");
  }
  const currency = billing.planCurrency;
  const existing = profile.creditSubscription;
  const view = {
    amountUsd,
    currency,
    amountMinor: creditAmountMinor(amountUsd, currency),
  };

  if (existing?.status === "active" && existing.amountUsd === amountUsd && !existing.cancelAtPeriodEnd) {
    throw conflict("same-amount", `You're already adding $${amountUsd} of AI credit each month.`);
  }
  if (existing?.upcoming?.status === "authenticated") {
    throw conflict("change-scheduled",
      `A change to $${existing.upcoming.amountUsd} a month is already set for ${existing.upcoming.startsAt?.slice(0, 10) ?? "your renewal date"}.`);
  }
  if (existing?.status === "pending" && existing.amountUsd === amountUsd) {
    return { subscriptionId: existing.subscriptionId, keyId: razorpayKeyId(), ...view, startsAt: null };
  }
  if (existing?.upcoming?.status === "created" && existing.upcoming.amountUsd === amountUsd) {
    return {
      subscriptionId: existing.upcoming.subscriptionId,
      keyId: razorpayKeyId(),
      ...view,
      startsAt: existing.upcoming.startsAt,
    };
  }

  const replacing = existing?.status === "active" && existing.amountUsd !== amountUsd;
  const end = existing?.currentPeriodEnd ? new Date(existing.currentPeriodEnd) : null;
  if (replacing && (!end || end.getTime() - Date.now() < 60 * 60_000)) {
    throw conflict("renewal-now", "Your renewal is happening right now — try changing the amount again after it.");
  }

  const customerId = billing.customerId || (await createCustomer(profile.name, caller.email)).id;
  const sub = await createSubscription(creditUnitPlanId(currency), customerId, caller.uid, {
    quantity: amountUsd,
    startAt: replacing && end ? Math.floor(end.getTime() / 1000) : undefined,
    notes: {
      kind: "credits",
      amount_usd: String(amountUsd),
      ...(replacing && existing ? { replaces: existing.subscriptionId } : {}),
    },
  });

  if (replacing && existing && end) {
    const ref = adminDb().collection(USERS).doc(caller.uid);
    await adminDb().runTransaction(async (tx) => {
      const fresh = creditSubscriptionFromDoc((await tx.get(ref)).data()?.creditSubscription);
      if (fresh?.subscriptionId !== existing.subscriptionId) {
        throw conflict("changed", "Your credit subscription just changed — reload and try again.");
      }
      tx.update(ref, {
        "creditSubscription.upcoming": {
          subscriptionId: sub.id,
          amountUsd,
          status: "created",
          startsAt: end.toISOString(),
          oldCancelled: false,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { subscriptionId: sub.id, keyId: razorpayKeyId(), ...view, startsAt: end.toISOString() };
  }

  await syncSubscription(sub.id, { source: "checkout", uidHint: caller.uid, planCurrency: currency }, {
    ...sub,
    notes: { uid: caller.uid, kind: "credits", amount_usd: String(amountUsd), ...(sub.notes ?? {}) },
  });
  return { subscriptionId: sub.id, keyId: razorpayKeyId(), ...view, startsAt: null };
}

/**
 * Checkout just finished in the browser: apply that subscription now, from
 * Razorpay's own state, instead of waiting for the webhook. The webhook is
 * still the truth — this is the same idempotent sync it runs — but the
 * page (and the second, AI-credit mandate after a workspace checkout) no
 * longer stalls when a webhook is slow or lost.
 */
export async function confirmCheckout(caller: Caller, requested: unknown): Promise<BillingSummary> {
  const profile = await readOrAdoptProfile(caller);
  if (!profile) throw badRequest("no-profile", "Make an account first.");
  const ours = [
    profile.billing?.subscriptionId,
    profile.billing?.upcoming?.subscriptionId,
    profile.creditSubscription?.subscriptionId,
    profile.creditSubscription?.upcoming?.subscriptionId,
  ].filter((id): id is string => Boolean(id));
  if (typeof requested !== "string" || !ours.includes(requested)) {
    throw badRequest("unknown-subscription", "That subscription isn't on your account.");
  }
  await syncSubscription(requested, { source: "checkout", uidHint: caller.uid });
  return summarize((await readOrAdoptProfile(caller)) ?? profile);
}

/** Cancel at the end of the paid period — nobody loses time they paid for. */
export type PlanChangeResponse = {
  subscriptionId: string;
  keyId: string;
  kind: "upgrade" | "downgrade";
  plan: ReturnType<typeof planView>;
  /** Charged now with the authorisation (upgrade); 0 for a downgrade. */
  chargeNowMinor: number;
  /** AI credit granted now until the renewal date (upgrade). */
  creditNowUsd: number;
  /** When the new plan's monthly price starts: the current renewal date. */
  startsAt: string;
};

/**
 * Switch plan, the standard way: an upgrade takes effect now (the prorated
 * difference is charged now, the same share of AI credit granted until the
 * renewal date); a downgrade takes effect at the renewal date. Either way the
 * billing date doesn't move.
 *
 * Mechanics (UPI and e-mandate subscriptions can't be changed in place): a
 * NEW subscription on the new plan, starting at the renewal date, with an
 * upgrade's difference charged upfront in the same checkout. Once its mandate
 * is set, the billing core grants the credit and tells the current
 * subscription to end at the renewal date; at the renewal it takes over.
 */
export async function startPlanChange(caller: Caller, requestedPlan: unknown): Promise<PlanChangeResponse> {
  if (!isPlanKey(requestedPlan)) throw badRequest("bad-plan", "Pick one of the plans.");
  const to = requestedPlan;
  const profile = await readOrAdoptProfile(caller);
  const billing = profile?.billing;
  if (!profile || !billing || billing.status !== "active") {
    throw badRequest("not-subscribed", "Changing plan needs an active subscription.");
  }
  if (billing.cancelAtPeriodEnd) {
    throw conflict("cancelled", "Your subscription is cancelled. Once it ends, subscribe again on the plan you want.");
  }
  const kind = changeKind(billing.plan, to);
  if (!kind) throw badRequest("same-plan", `You're already on ${PLANS[to].name}.`);

  const currency = billing.planCurrency;
  const plan = planView(to, currency);
  const up = billing.upcoming;
  if (up?.status === "authenticated") {
    throw conflict("change-scheduled",
      `A switch to ${PLANS[up.plan].name} is already set for ${up.startsAt?.slice(0, 10) ?? "your renewal date"}.`);
  }
  if (up && up.status === "created" && up.plan === to) {
    // The same change, checkout reopened: reuse it.
    return {
      subscriptionId: up.subscriptionId, keyId: razorpayKeyId(), kind, plan,
      chargeNowMinor: up.chargeMinor, creditNowUsd: up.creditUsd, startsAt: up.startsAt ?? billing.currentPeriodEnd ?? "",
    };
  }

  const end = billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : null;
  const now = new Date();
  if (!end || end.getTime() - now.getTime() < 60 * 60_000) {
    throw conflict("renewal-now", "Your renewal is happening right now — try changing plan again after it.");
  }
  const start = billing.currentPeriodStart ? new Date(billing.currentPeriodStart) : new Date(end.getTime() - 30 * 86_400_000);
  const p = kind === "upgrade" ? prorate(billing.plan, to, currency, start, end, now) : { chargeMinor: 0, creditUsd: 0, fraction: 0 };

  const lock = adminDb().collection("billing_locks").doc(caller.uid);
  await adminDb().runTransaction(async (tx) => {
    const held = await tx.get(lock);
    const at = held.data()?.at?.toMillis?.() ?? 0;
    if (held.exists && Date.now() - at < 60_000) {
      throw conflict("checkout-busy", "Checkout is already opening — give it a moment.");
    }
    tx.set(lock, { at: FieldValue.serverTimestamp() });
  });
  try {
    const customerId = billing.customerId || (await createCustomer(profile.name, caller.email)).id;
    const sub = await createSubscription(planIdFor(currency, to), customerId, caller.uid, {
      startAt: Math.floor(end.getTime() / 1000),
      upfront: p.chargeMinor > 0
        ? { name: `${PLANS[to].name} for the rest of this cycle`, amountMinor: p.chargeMinor, currency }
        : undefined,
      notes: { replaces: billing.subscriptionId, change: kind },
    });
    const ref = adminDb().collection(USERS).doc(caller.uid);
    await adminDb().runTransaction(async (tx) => {
      const fresh = (await tx.get(ref)).data()?.billing;
      if (fresh?.subscriptionId !== billing.subscriptionId) {
        throw conflict("changed", "Your subscription just changed — reload and try again.");
      }
      tx.update(ref, {
        "billing.upcoming": {
          subscriptionId: sub.id,
          plan: to,
          kind,
          status: "created",
          startsAt: end.toISOString(),
          chargeMinor: p.chargeMinor,
          creditUsd: p.creditUsd,
          creditGranted: false,
          oldCancelled: false,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    shipLog("billing", `plan change started: ${kind}`, { email: caller.email, from: billing.plan, to, charge: p.chargeMinor, sub: sub.id });
    return {
      subscriptionId: sub.id, keyId: razorpayKeyId(), kind, plan,
      chargeNowMinor: p.chargeMinor, creditNowUsd: p.creditUsd, startsAt: end.toISOString(),
    };
  } finally {
    await lock.delete().catch(() => {});
  }
}

export async function cancelSubscription(caller: Caller): Promise<Billing> {
  const profile = await readOrAdoptProfile(caller);
  const billing = profile?.billing;
  if (!profile || !billing || billing.status !== "active") {
    throw badRequest("not-subscribed", "There is no active subscription to cancel.");
  }
  if (billing.cancelAtPeriodEnd) {
    throw conflict("already-cancelled", "Your subscription is already cancelled.");
  }

  // A plan change in flight goes too: cancelling means no further charges.
  if (billing.upcoming) {
    try {
      await cancelSubscriptionNow(billing.upcoming.subscriptionId);
    } catch (e) {
      if (!isMissingOnRazorpay(e)) throw e;
    }
    await syncSubscription(billing.upcoming.subscriptionId, { source: "cancel", uidHint: caller.uid });
  }
  try {
    const sub = await cancelSubscriptionAtCycleEnd(billing.subscriptionId);
    shipLog("billing", "subscription cancelled at cycle end", { email: caller.email, sub: sub.id });
    // Razorpay keeps it `active` until the cycle ends; the intent is what
    // records that it is ending.
    await syncSubscription(billing.subscriptionId,
      { source: "cancel", uidHint: caller.uid, intent: { cancelAtPeriodEnd: true } }, sub);
  } catch (e) {
    if (!isMissingOnRazorpay(e)) throw e;
    // Razorpay has no such subscription (a test-mode leftover): it can't
    // charge — the sync records it as ended rather than failing forever.
    await syncSubscription(billing.subscriptionId, { source: "cancel", uidHint: caller.uid });
  }
  const after = (await readOrAdoptProfile(caller))?.billing;
  return after ?? billing;
}

/**
 * A webhook delivery. The signature has already been verified; this applies
 * the event exactly once, keyed by Razorpay's event id, and maps it to a
 * person through `notes.uid` stamped at creation.
 */
/**
 * A webhook we could not match to an account. Money may have moved, so it is
 * written where an admin looks (billing_events → the Operations feed) — not
 * just a console line that scrolls away.
 */
export function ignoredEventDoc(
  eventName: string,
  reason: string,
  ids: { uid?: string | null; subscriptionId?: string | null; paymentId?: string | null; orderId?: string | null },
) {
  return {
    eventName,
    outcome: "ignored",
    reason,
    uid: ids.uid ?? null,
    subscriptionId: ids.subscriptionId ?? null,
    paymentId: ids.paymentId ?? null,
    orderId: ids.orderId ?? null,
    flag: true,
    resolved: false,
    receivedAt: FieldValue.serverTimestamp(),
  };
}

export async function recordIgnoredWebhook(
  eventId: string,
  eventName: string,
  reason: string,
  ids: Parameters<typeof ignoredEventDoc>[2],
): Promise<void> {
  console.error(`[billing] ignored ${eventName} (${eventId}): ${reason}`, ids);
  shipLog("billing", `webhook ignored: ${reason}`, { event: eventName, eventId, ...ids }, "error");
  try {
    const events = adminDb().collection(EVENTS);
    // Keyed by event id so Razorpay's redeliveries collapse to one row.
    await (eventId ? events.doc(eventId) : events.doc()).set(ignoredEventDoc(eventName, reason, ids));
  } catch (e) {
    console.error(`[billing] could not record ignored ${eventName} (${eventId})`, e);
  }
}

export { iso as _isoForTests };


/**
 * The workspace is being removed: stop billing for it, NOW, before anything is
 * deleted. Called ahead of queuing the remove op so that if Razorpay fails,
 * nothing is deleted and the caller sees why — a removed workspace that keeps
 * charging is the worse failure. Optionally refunds the most recent paid
 * charge (an explicit admin choice, never automatic).
 *
 * Returns a human-readable summary for the audit trail.
 */
export class PaidAgain extends Error {
  constructor(subscriptionId: string) {
    super(`subscription ${subscriptionId} is active again on Razorpay`);
  }
}

/**
 * Ask Razorpay, not our copy: the local status can lag a webhook. Returns a
 * summary for the audit trail. Never cancels a subscription Razorpay says is
 * paid up when `refusePaid` (the lifecycle sweep) — the customer paid between
 * the sweep's read and now, and deleting them would take their money and
 * their work.
 */
export async function stopBillingForRemoval(
  uid: string,
  refund: boolean,
  { refusePaid = false }: { refusePaid?: boolean } = {},
): Promise<string> {
  const ref = adminDb().collection(USERS).doc(uid);
  const snap = await ref.get();
  const billing = snap.data()?.billing as { subscriptionId?: string; status?: string } | undefined;
  if (!billing?.subscriptionId) return "no subscription";

  const subId = billing.subscriptionId;
  const live = await fetchSubscriptionOrMissing(subId);
  const parts: string[] = [];
  // Removal ends the period now: nothing should promise "stays up until".
  const markEnded = () =>
    syncSubscription(subId, { source: "removal", uidHint: uid, intent: { endedNow: true } });

  if (!live) {
    // Not known to Razorpay in this mode (a test-mode leftover after going
    // live): it cannot charge, and there is nothing there to refund.
    await markEnded();
    parts.push(`subscription ${subId} not found in Razorpay — nothing can charge`);
    if (refund) parts.push("no refund possible (not a live-mode payment)");
    refund = false;
  } else if (TERMINAL.has(live.status)) {
    await markEnded();
    parts.push(`subscription already ${live.status}`);
  } else {
    if (refusePaid && live.status === "active") throw new PaidAgain(subId);
    try {
      await cancelSubscriptionNow(subId);
      await markEnded();
      parts.push(`cancelled ${subId}`);
    } catch (e) {
      // Never paid (checkout opened, mandate not set up): it cannot charge.
      if (live.status !== "created") throw e;
      parts.push(`unpaid checkout ${subId} left to expire`);
    }
  }

  if (refund) {
    const last = await lastPaidPayment(subId);
    if (!last) {
      parts.push("no paid charge to refund");
    } else {
      const payment = await fetchPayment(last.paymentId);
      if ((payment.amount_refunded ?? 0) >= payment.amount) {
        parts.push(`${last.paymentId} already refunded`);
      } else {
        const r = await refundPayment(last.paymentId, "workspace removed");
        parts.push(`refunded ${last.paymentId} (${r.amount / 100})`);
      }
    }
  }

  const summary = parts.join("; ");
  shipLog("billing", "billing stopped for removal", { uid, detail: summary }, "warn");
  // Recorded now, where admins look: money may have moved even if the removal
  // that follows fails.
  await adminDb()
    .collection(EVENTS)
    .add({ eventName: "removal.billing_stopped", uid, outcome: summary, receivedAt: FieldValue.serverTimestamp() })
    .catch((e) => console.error(`[billing] could not record billing stop for ${uid}`, e));
  return summary;
}

/**
 * The account is being deleted. Any subscription still able to charge is
 * cancelled first; a refusal from Razorpay aborts the deletion — except for a
 * never-paid ("pending") checkout, which cannot charge without the person
 * completing it, and whose late payment would now be recorded as unmatched.
 */
export async function stopBillingForDeletion(billing: {
  subscriptionId?: string;
  status?: string;
} | undefined): Promise<string> {
  if (!billing?.subscriptionId) return "no subscription";
  if (billing.status === "ended") return `subscription ${billing.subscriptionId} already ended`;
  try {
    await cancelSubscriptionNow(billing.subscriptionId);
    return `cancelled ${billing.subscriptionId}`;
  } catch (e) {
    // Our copy may lag: if Razorpay already closed it, or it was never paid
    // for, nothing can charge — proceed. Anything else stays a refusal.
    if (isMissingOnRazorpay(e)) return `subscription ${billing.subscriptionId} not found in Razorpay — nothing can charge`;
    const live = await fetchSubscriptionOrMissing(billing.subscriptionId).catch(() => undefined);
    if (live === null) return `subscription ${billing.subscriptionId} not found in Razorpay — nothing can charge`;
    if (live && TERMINAL.has(live.status)) return `subscription ${billing.subscriptionId} already ${live.status}`;
    if (live?.status === "created" || (!live && billing.status === "pending")) {
      console.warn(`[billing] could not cancel unpaid ${billing.subscriptionId}`, e);
      return `unpaid checkout ${billing.subscriptionId} left to expire`;
    }
    throw e;
  }
}
