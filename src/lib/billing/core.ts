/**
 * The billing core, pure: one function decides what a subscription's state
 * means for an account. Every source — the webhook, the reconciler, checkout,
 * cancel, removal, a plan change — fetches Razorpay's CURRENT view of the
 * subscription and hands it here; one server function writes the result.
 * Because the input is the provider's present state, not an event, order and
 * redelivery stop mattering: the same state applied twice changes nothing.
 *
 * Plan changes: Razorpay can't change a UPI/e-mandate subscription in place,
 * so a change is a second subscription (the "upcoming" one) that starts at
 * the current renewal date. This decides both: the current subscription's
 * state, and the upcoming one's progress until it takes over.
 */

import { normalizeProviderStatus, type Billing, type CreditSubscription, type LockedBill, type PlanCurrency } from "./model.ts";
import type { PlanKey } from "./plans.ts";

/** Razorpay's subscription entity, the fields we read. */
export type SubscriptionState = {
  id: string;
  status: string;
  customer_id?: string | null;
  current_start?: number | null;
  current_end?: number | null;
  paid_count?: number | null;
};

/** What the account looks like around its billing, for deciding effects. */
export type AccountFacts = {
  hasWorkspace: boolean;
  pendingUsername: string | null;
  suspended: boolean;
};

/** Something only we know and Razorpay doesn't record. */
export type Intent = {
  /** The person cancelled: it ends at the period end. */
  cancelAtPeriodEnd?: boolean;
  /** Removal stopped it now: the paid period is over today. */
  endedNow?: boolean;
};

export type Effects = {
  /** A charge we haven't granted for: settle the cycle, grant the month. */
  grantMonth: boolean;
  /** Monthly AI credit bought with the workspace subscription, added for this charge (USD). */
  addCreditUsd: number;
  /** Paid and no workspace: build it. */
  queueBuild: boolean;
  /** Paid and paused by us: bring it back. */
  resume: boolean;
  /** The monthly AI allowance changes to this (a new plan took effect). */
  setIncludedUsd: number | null;
  /** An upgrade's share of the allowance, granted now until the renewal date. */
  grantCredit: { id: string; usd: number; expiresAt: string | null } | null;
  /** Tell Razorpay the current subscription ends at the renewal date. */
  cancelCurrentAtPeriodEnd: string | null;
};

const NO_EFFECTS: Effects = {
  grantMonth: false,
  addCreditUsd: 0,
  queueBuild: false,
  resume: false,
  setIncludedUsd: null,
  grantCredit: null,
  cancelCurrentAtPeriodEnd: null,
};

export type Decision =
  | { kind: "stale"; reason: string }
  | { kind: "apply"; billing: Omit<Billing, "updatedAt">; effects: Effects; changed: boolean };

const isoFromUnix = (t: number | null | undefined) => (t ? new Date(t * 1000).toISOString() : null);
const TERMINAL = new Set(["cancelled", "completed", "expired", "missing", "halted"]);

/**
 * A charge grants a month once per paid_count. `paidCount` on our record is
 * the count we last granted for; a new subscription starts at Razorpay's count
 * (0). An older record without one: we can't tell what was granted, so a
 * charge hint grants (as before) and anything else just sets the baseline.
 */
function grantDecision(stored: number | null | undefined, live: number | null | undefined, chargeHint: boolean) {
  if (live === null || live === undefined) return { grant: chargeHint, next: stored ?? null };
  if (stored === null || stored === undefined) return { grant: chargeHint, next: live };
  return live > stored ? { grant: true, next: live } : { grant: false, next: stored };
}

/**
 * The paid_count to record. A charge seen before the subscription reads
 * active (Razorpay can report "authenticated" with the first charge already
 * counted) is not granted yet — so the count must not move either, or the
 * first active sync would see nothing new and the cycle's credit is lost.
 */
function grantFor(
  stored: number | null | undefined,
  live: number | null | undefined,
  chargeHint: boolean,
  active: boolean,
): { grant: boolean; paidCount: number | null } {
  const d = grantDecision(stored, live, chargeHint);
  if (d.grant && !active) return { grant: false, paidCount: stored ?? null };
  return { grant: d.grant, paidCount: d.next };
}

export type DecideOptions = {
  planCurrency: PlanCurrency;
  /** The plan this subscription is for (from its Razorpay plan id). */
  plan: PlanKey;
  /** Monthly AI credit this subscription carries (USD, from its notes). */
  creditUsd?: number;
  /** The bill quoted at checkout (from its notes), kept for display. */
  bill?: LockedBill | null;
  intent?: Intent;
  chargeHint?: boolean;
  now?: Date;
};

export function decide(
  prior: Billing | null,
  sub: SubscriptionState,
  facts: AccountFacts,
  opts: DecideOptions,
): Decision {
  if (prior?.upcoming && prior.upcoming.subscriptionId === sub.id) {
    return decideUpcoming(prior, sub, facts, opts);
  }
  return decideCurrent(prior, sub, facts, opts);
}

function decideCurrent(
  prior: Billing | null,
  sub: SubscriptionState,
  facts: AccountFacts,
  opts: DecideOptions,
): Decision {
  const now = opts.now ?? new Date();
  const sameSub = prior?.subscriptionId === sub.id;

  // An older subscription reporting late must not overwrite the one the
  // person actually pays for.
  if (prior && !sameSub && prior.status === "active") {
    return { kind: "stale", reason: `account is active on ${prior.subscriptionId}` };
  }

  // "missing": Razorpay doesn't know the id (a test-mode leftover) — it can
  // never charge, so it is ended, not the "pending" an unknown status maps to.
  const status = opts.intent?.endedNow || sub.status === "missing" ? "ended" : normalizeProviderStatus(sub.status);
  const { grant: grantMonth, paidCount } = grantFor(
    sameSub ? prior?.paidCount : 0,
    sub.paid_count,
    Boolean(opts.chargeHint),
    status === "active",
  );
  const creditUsd = opts.creditUsd ?? (sameSub ? (prior?.creditUsd ?? 0) : 0);
  const bill = opts.bill ?? (sameSub ? (prior?.bill ?? null) : null);

  const currentPeriodEnd = opts.intent?.endedNow
    ? now.toISOString()
    : (isoFromUnix(sub.current_end) ?? (sameSub ? (prior?.currentPeriodEnd ?? null) : null));
  const currentPeriodStart = isoFromUnix(sub.current_start) ?? (sameSub ? (prior?.currentPeriodStart ?? null) : null);
  const plan = sameSub ? (prior?.plan ?? opts.plan) : opts.plan;

  const billing: Omit<Billing, "updatedAt"> = {
    status,
    statusSince: sameSub && prior?.status === status ? (prior?.statusSince ?? now.toISOString()) : now.toISOString(),
    planCurrency: opts.planCurrency,
    subscriptionId: sub.id,
    customerId: sub.customer_id ?? (sameSub ? (prior?.customerId ?? "") : ""),
    currentPeriodEnd,
    currentPeriodStart,
    providerStatus: sub.status,
    cancelAtPeriodEnd: opts.intent?.cancelAtPeriodEnd ? true : sameSub ? Boolean(prior?.cancelAtPeriodEnd) : false,
    paidCount,
    plan,
    // A change in flight stays with the subscription it would replace; a
    // brand-new current subscription starts with none.
    upcoming: sameSub ? (prior?.upcoming ?? null) : null,
    creditUsd,
    bill,
  };

  const paid = status === "active";
  // A paid cycle adds the monthly AI credit the subscription was bought
  // with (0 for workspace only). Older accounts' separate credit
  // subscription adds on its own path.
  const effects: Effects = {
    ...NO_EFFECTS,
    grantMonth,
    addCreditUsd: grantMonth ? creditUsd : 0,
    queueBuild: paid && !facts.hasWorkspace && Boolean(facts.pendingUsername),
    resume: paid && facts.suspended && facts.hasWorkspace,
    setIncludedUsd: null,
  };

  return { kind: "apply", billing, effects, changed: changedFrom(prior, billing) || grantMonth };
}

/**
 * The subscription that will replace the current one at the renewal date.
 * - created:        checkout opened, nothing to do yet.
 * - authenticated:  the mandate is set — tell Razorpay the current one ends
 *                   at the renewal date, and (upgrade) grant the prorated AI
 *                   credit now, both exactly once.
 * - active:         it took over: it becomes the current subscription.
 * - ended unpaid:   abandoned or failed before starting — dropped.
 */
function decideUpcoming(
  prior: Billing,
  sub: SubscriptionState,
  facts: AccountFacts,
  opts: DecideOptions,
): Decision {
  const u = prior.upcoming!;
  const status = sub.status === "missing" ? "ended" : normalizeProviderStatus(sub.status);

  if (status === "active") {
    // Took over at the renewal date: it IS the subscription now.
    const promoted = decideCurrent(
      { ...prior, status: "ended", upcoming: null },
      sub,
      facts,
      { ...opts, plan: u.plan },
    );
    if (promoted.kind === "stale") return promoted;
    return {
      ...promoted,
      effects: { ...promoted.effects, setIncludedUsd: null },
      changed: true,
    };
  }

  if (TERMINAL.has(sub.status) && (sub.paid_count ?? 0) === 0) {
    const billing = { ...stripUpdated(prior), upcoming: null };
    return { kind: "apply", billing, effects: NO_EFFECTS, changed: true };
  }

  const authenticated = sub.status === "authenticated" || u.status === "authenticated";
  const grantCredit =
    authenticated && u.kind === "upgrade" && !u.creditGranted && u.creditUsd > 0
      ? { id: `upgrade-${u.subscriptionId}`, usd: u.creditUsd, expiresAt: prior.currentPeriodEnd }
      : null;
  const next = {
    ...u,
    status: authenticated ? ("authenticated" as const) : u.status,
    startsAt: u.startsAt ?? prior.currentPeriodEnd,
    creditGranted: u.creditGranted || Boolean(grantCredit),
  };
  const billing = { ...stripUpdated(prior), upcoming: next };
  const effects: Effects = {
    ...NO_EFFECTS,
    grantCredit,
    cancelCurrentAtPeriodEnd: authenticated && !u.oldCancelled ? prior.subscriptionId : null,
  };
  const changed =
    next.status !== u.status || next.creditGranted !== u.creditGranted || next.startsAt !== u.startsAt;
  return { kind: "apply", billing, effects, changed: changed || Boolean(effects.cancelCurrentAtPeriodEnd) };
}

function stripUpdated(b: Billing): Omit<Billing, "updatedAt"> {
  const { updatedAt: _ignored, ...rest } = b;
  void _ignored;
  return rest;
}

function changedFrom(prior: Billing | null, b: Omit<Billing, "updatedAt">): boolean {
  if (!prior) return true;
  return (
    prior.subscriptionId !== b.subscriptionId ||
    prior.status !== b.status ||
    prior.providerStatus !== b.providerStatus ||
    prior.currentPeriodEnd !== b.currentPeriodEnd ||
    prior.currentPeriodStart !== b.currentPeriodStart ||
    Boolean(prior.cancelAtPeriodEnd) !== b.cancelAtPeriodEnd ||
    (prior.paidCount ?? null) !== (b.paidCount ?? null) ||
    prior.plan !== b.plan ||
    (prior.creditUsd ?? 0) !== b.creditUsd ||
    JSON.stringify(prior.bill ?? null) !== JSON.stringify(b.bill)
  );
}

/** Razorpay no longer knows this subscription (a test-mode leftover). */
export const missing = (id: string): SubscriptionState => ({ id, status: "missing" });

/**
 * A current subscription that ends while its replacement is set to start is
 * switching plans, not lapsing: nothing may be paused in that gap.
 */
export function switchingPlans(b: Pick<Billing, "upcoming"> | null | undefined): boolean {
  return b?.upcoming?.status === "authenticated";
}

export type CreditEffects = {
  /** Dollars to add to purchasedUsd for this charge. 0 when nothing new was paid. */
  addUsd: number;
  /** Tell Razorpay the current credit subscription ends at the renewal date. */
  cancelCurrentAtPeriodEnd: string | null;
};

export type CreditDecision =
  | { kind: "stale"; reason: string }
  | { kind: "apply"; subscription: Omit<CreditSubscription, "updatedAt">; effects: CreditEffects; changed: boolean };

const NO_CREDIT: CreditEffects = { addUsd: 0, cancelCurrentAtPeriodEnd: null };

export type DecideCreditOptions = {
  currency: PlanCurrency;
  /** The dollar amount this Razorpay subscription represents. */
  amountUsd: number;
  intent?: Intent;
  chargeHint?: boolean;
  now?: Date;
};

/**
 * The monthly AI-credit subscription. A charge adds `amountUsd` to the
 * balance (rollover). An amount change is an upcoming subscription that
 * takes over at renewal; the balance is not reset.
 */
export function decideCredit(
  prior: CreditSubscription | null,
  sub: SubscriptionState,
  opts: DecideCreditOptions,
): CreditDecision {
  if (prior?.upcoming && prior.upcoming.subscriptionId === sub.id) {
    return decideCreditUpcoming(prior, sub, opts);
  }
  return decideCreditCurrent(prior, sub, opts);
}

function decideCreditCurrent(
  prior: CreditSubscription | null,
  sub: SubscriptionState,
  opts: DecideCreditOptions,
): CreditDecision {
  const now = opts.now ?? new Date();
  const sameSub = prior?.subscriptionId === sub.id;
  if (prior && !sameSub && prior.status === "active") {
    return { kind: "stale", reason: `credit subscription is active on ${prior.subscriptionId}` };
  }
  const status = opts.intent?.endedNow || sub.status === "missing" ? "ended" : normalizeProviderStatus(sub.status);
  const { grant, paidCount } = grantFor(
    sameSub ? prior?.paidCount : 0,
    sub.paid_count,
    Boolean(opts.chargeHint),
    status === "active",
  );
  const addUsd = grant ? opts.amountUsd : 0;
  const subscription: Omit<CreditSubscription, "updatedAt"> = {
    status,
    currency: opts.currency,
    amountUsd: opts.amountUsd,
    subscriptionId: sub.id,
    customerId: sub.customer_id ?? (sameSub ? (prior?.customerId ?? "") : ""),
    currentPeriodEnd: opts.intent?.endedNow
      ? now.toISOString()
      : (isoFromUnix(sub.current_end) ?? (sameSub ? (prior?.currentPeriodEnd ?? null) : null)),
    currentPeriodStart: isoFromUnix(sub.current_start) ?? (sameSub ? (prior?.currentPeriodStart ?? null) : null),
    providerStatus: sub.status,
    statusSince: sameSub && prior?.status === status ? (prior?.statusSince ?? now.toISOString()) : now.toISOString(),
    cancelAtPeriodEnd: opts.intent?.cancelAtPeriodEnd ? true : sameSub ? Boolean(prior?.cancelAtPeriodEnd) : false,
    paidCount,
    upcoming: sameSub ? (prior?.upcoming ?? null) : null,
  };
  const changed =
    !prior ||
    prior.subscriptionId !== subscription.subscriptionId ||
    prior.status !== subscription.status ||
    prior.amountUsd !== subscription.amountUsd ||
    prior.providerStatus !== subscription.providerStatus ||
    prior.currentPeriodEnd !== subscription.currentPeriodEnd ||
    (prior.paidCount ?? null) !== (subscription.paidCount ?? null) ||
    Boolean(prior.cancelAtPeriodEnd) !== subscription.cancelAtPeriodEnd ||
    addUsd > 0;
  return { kind: "apply", subscription, effects: { ...NO_CREDIT, addUsd }, changed };
}

function decideCreditUpcoming(
  prior: CreditSubscription,
  sub: SubscriptionState,
  opts: DecideCreditOptions,
): CreditDecision {
  const u = prior.upcoming!;
  const status = sub.status === "missing" ? "ended" : normalizeProviderStatus(sub.status);
  if (status === "active") {
    const promoted = decideCreditCurrent(
      { ...prior, status: "ended", upcoming: null },
      sub,
      { ...opts, amountUsd: u.amountUsd },
    );
    if (promoted.kind === "stale") return promoted;
    return { ...promoted, changed: true };
  }
  if (TERMINAL.has(sub.status) && (sub.paid_count ?? 0) === 0) {
    const { updatedAt: _ignored, ...rest } = prior;
    void _ignored;
    return { kind: "apply", subscription: { ...rest, upcoming: null }, effects: NO_CREDIT, changed: true };
  }
  const authenticated = sub.status === "authenticated" || u.status === "authenticated";
  const next = {
    ...u,
    status: authenticated ? ("authenticated" as const) : u.status,
    startsAt: u.startsAt ?? prior.currentPeriodEnd,
  };
  const { updatedAt: _ignored, ...rest } = prior;
  void _ignored;
  const subscription = { ...rest, upcoming: next };
  const effects: CreditEffects = {
    addUsd: 0,
    cancelCurrentAtPeriodEnd: authenticated && !u.oldCancelled ? prior.subscriptionId : null,
  };
  const changed = next.status !== u.status || next.startsAt !== u.startsAt || Boolean(effects.cancelCurrentAtPeriodEnd);
  return { kind: "apply", subscription, effects, changed };
}
