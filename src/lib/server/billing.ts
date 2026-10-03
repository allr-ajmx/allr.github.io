import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import { reserveUsername } from "./provisioning";
import { readOrAdoptProfile } from "./profiles";
import type { Caller } from "./session";
import { enqueueInTransaction, enqueueOp, queueRef, readQueue } from "./provisioning";
import { applyMonthlyGrantInTransaction } from "./credits";
import { shipLog } from "./logship";
import { triageSubscriptionEvent } from "@/lib/billing/triage";
import {
  cancelSubscriptionNow,
  fetchPayment,
  lastPaidPayment,
  refundPayment,
  cancelSubscriptionAtCycleEnd,
  createCustomer,
  createSubscription,
  fetchSubscription,
  planIdFor,
  razorpayKeyId,
  type RzpSubscription,
} from "./razorpay";
import {
  PLAN_INTERVAL,
  PLAN_PRICING,
  normalizeProviderStatus,
  planCurrencyFor,
  type Billing,
  type BillingSummary,
  type SubscribeResponse,
} from "@/lib/billing/model";
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

export async function summarize(profile: UserProfile): Promise<BillingSummary> {
  const currency = planCurrencyFor(profile.country);
  const workspace = hasWorkspace(profile);
  return {
    billing: readBilling(profile),
    // Paying is the gate now; the workspace is what payment buys.
    canSubscribe: true,
    hasWorkspace: workspace,
    pendingUsername: profile.pendingWorkspaceUsername,
    provisioning:
      !workspace && (profile.billing || profile.promo) ? await readQueue(profile.uid) : null,
    plan: {
      currency,
      amountMinor: PLAN_PRICING[currency].amountMinor,
      display: PLAN_PRICING[currency].display,
      interval: PLAN_INTERVAL,
    },
  };
}

function billingFrom(
  sub: RzpSubscription,
  planCurrency: Billing["planCurrency"],
  customerId: string,
  prior?: Pick<Billing, "status" | "statusSince" | "subscriptionId" | "cancelAtPeriodEnd"> | null,
): Omit<Billing, "updatedAt"> {
  const status = normalizeProviderStatus(sub.status);
  return {
    cancelAtPeriodEnd: prior?.subscriptionId === sub.id ? Boolean(prior?.cancelAtPeriodEnd) : false,
    status,
    statusSince:
      prior && prior.status === status
        ? (prior.statusSince ?? new Date().toISOString())
        : new Date().toISOString(),
    planCurrency,
    subscriptionId: sub.id,
    customerId: sub.customer_id ?? customerId,
    currentPeriodEnd: sub.current_end
      ? new Date(sub.current_end * 1000).toISOString()
      : null,
    providerStatus: sub.status,
  };
}

async function writeBilling(uid: string, billing: Omit<Billing, "updatedAt">) {
  await adminDb()
    .collection(USERS)
    .doc(uid)
    .update({
      billing: { ...billing, updatedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    });
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
): Promise<SubscribeResponse> {
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
  const plan = {
    currency,
    amountMinor: PLAN_PRICING[currency].amountMinor,
    display: PLAN_PRICING[currency].display,
    interval: PLAN_INTERVAL,
  };

  const existing = profile.billing;
  if (existing) {
    if (existing.status === "active") {
      throw conflict("already-subscribed", "Your workspace is already paid for.");
    }
    // A checkout that was opened and abandoned, or a mandate that is failing:
    // the same subscription is the one to finish or fix.
    if (existing.status === "pending" || existing.status === "pastDue") {
      const sub = await fetchSubscription(existing.subscriptionId);
      if (normalizeProviderStatus(sub.status) !== "ended") {
        await writeBilling(caller.uid, billingFrom(sub, existing.planCurrency, existing.customerId, existing));
        return { subscriptionId: sub.id, keyId: razorpayKeyId(), plan };
      }
    }
  }

  const customer = await createCustomer(profile.name, caller.email);
  const sub = await createSubscription(planIdFor(currency), customer.id, caller.uid);
  await writeBilling(caller.uid, billingFrom(sub, currency, customer.id));
  shipLog("billing", "subscription created", { email: caller.email, currency, sub: sub.id });

  return { subscriptionId: sub.id, keyId: razorpayKeyId(), plan };
}

/** Cancel at the end of the paid period — nobody loses time they paid for. */
export async function cancelSubscription(caller: Caller): Promise<Billing> {
  const profile = await readOrAdoptProfile(caller);
  const billing = profile?.billing;
  if (!profile || !billing || billing.status !== "active") {
    throw badRequest("not-subscribed", "There is no active subscription to cancel.");
  }
  if (billing.cancelAtPeriodEnd) {
    throw conflict("already-cancelled", "Your subscription is already cancelled.");
  }

  const sub = await cancelSubscriptionAtCycleEnd(billing.subscriptionId);
  shipLog("billing", "subscription cancelled at cycle end", { email: caller.email, sub: sub.id });
  const next = {
    ...billingFrom(sub, billing.planCurrency, billing.customerId, billing),
    cancelAtPeriodEnd: true,
  };
  // Razorpay reports `cancelled` only at cycle end; until then the status
  // stays `active` and cancelAtPeriodEnd is what says it is ending.
  await writeBilling(caller.uid, next);
  return { ...next, updatedAt: new Date().toISOString() };
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

export async function applyWebhookEvent(
  eventId: string,
  eventName: string,
  subscription: RzpSubscription | undefined,
): Promise<"applied" | "duplicate" | "ignored"> {
  const triage = triageSubscriptionEvent(eventName, subscription);
  if (!triage.act || !subscription) {
    if (!triage.act && triage.record) {
      await recordIgnoredWebhook(eventId, eventName, triage.reason, { subscriptionId: subscription?.id ?? null });
    }
    return "ignored";
  }
  const uid = String(subscription.notes?.uid);

  const db = adminDb();
  const eventRef = db.collection(EVENTS).doc(eventId);
  // notes.uid is stamped at creation; an account can move to a new uid
  // afterwards (email transfer, adoption). The subscription id is stable.
  let userRef = db.collection(USERS).doc(uid);
  if (!(await userRef.get()).exists) {
    const moved = await db
      .collection(USERS)
      .where("billing.subscriptionId", "==", subscription.id)
      .limit(1)
      .get();
    if (moved.docs[0]) {
      console.warn(`[billing] ${subscription.id}: uid ${uid} gone, account moved to ${moved.docs[0].id}`);
      userRef = moved.docs[0].ref;
    }
  }

  return db.runTransaction(async (tx) => {
    const [seen, user, queueSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(userRef),
      tx.get(queueRef(userRef.id)),
    ]);
    if (seen.exists) return "duplicate" as const;
    if (!user.exists) {
      // A closing event for an account we deleted (we cancel before deleting)
      // is expected, not lost money: record it quietly.
      const closing = TERMINAL.has(subscription.status);
      tx.set(eventRef, {
        ...ignoredEventDoc(eventName, "no account for this uid or subscription", {
          uid, subscriptionId: subscription.id,
        }),
        ...(closing ? { outcome: "ignored-closed" } : {}),
      });
      return "ignored" as const;
    }

    const prior = user.data()?.billing as (Billing & { updatedAt: unknown }) | undefined;
    // Events can arrive out of order; a stale one must not overwrite the
    // subscription the person actually has.
    if (prior && prior.subscriptionId !== subscription.id && prior.status === "active") {
      tx.set(eventRef, {
        eventName,
        subscriptionId: subscription.id,
        outcome: "ignored-stale",
        receivedAt: FieldValue.serverTimestamp(),
      });
      return "ignored" as const;
    }

    const data = user.data()!;
    const nextStatus = normalizeProviderStatus(subscription.status);
    // Payment is current again: the fast path undoes a billing suspension
    // without waiting for the hourly sweep. completeOp clears the mark.
    if (nextStatus === "active" && data.enforcement && data.workspace_username) {
      enqueueOp(tx, {
        uid: userRef.id,
        email: data.email,
        username: data.workspace_username,
        op: "resume",
        valueUsd: 0,
      });
    }
    tx.update(userRef, {
      billing: {
        status: nextStatus,
        statusSince:
          prior && prior.status === nextStatus
            ? (prior.statusSince ?? new Date().toISOString())
            : new Date().toISOString(),
        planCurrency: prior?.planCurrency ?? "USD",
        subscriptionId: subscription.id,
        customerId: subscription.customer_id ?? prior?.customerId ?? "",
        currentPeriodEnd: subscription.current_end
          ? new Date(subscription.current_end * 1000).toISOString()
          : (prior?.currentPeriodEnd ?? null),
        providerStatus: subscription.status,
        // Every event rewrites billing whole: carry the cancellation forward
        // for the same subscription, never onto a new one.
        cancelAtPeriodEnd:
          prior?.subscriptionId === subscription.id ? Boolean(prior?.cancelAtPeriodEnd) : false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    // A successful monthly charge settles the credit cycle: included expires,
    // top-ups carry, the key's limit is re-targeted.
    if (eventName === "subscription.charged") {
      applyMonthlyGrantInTransaction(tx, userRef, data);
    }
    // The moment payment is real, a workspace-less account goes on the queue.
    const paid = normalizeProviderStatus(subscription.status) === "active";
    const noWorkspace = !String(data.workspace_username ?? "").trim();
    const pending = String(data.pending_workspace_username ?? "").trim();
    if (paid && noWorkspace && pending) {
      enqueueInTransaction(tx, queueSnap, { uid: userRef.id, email: data.email, username: pending });
    }

    tx.set(eventRef, {
      eventName,
      subscriptionId: subscription.id,
      uid: userRef.id,
      outcome: "applied",
      receivedAt: FieldValue.serverTimestamp(),
    });
    return "applied" as const;
  }).then((outcome) => {
    shipLog("billing", `webhook ${eventName}`, { uid, sub: subscription.id, outcome },
      normalizeProviderStatus(subscription.status) === "pastDue" ? "warn" : "info");
    return outcome;
  });
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
  const live = await fetchSubscription(subId);
  const parts: string[] = [];
  // Removal ends the period now: nothing should promise "stays up until".
  const markEnded = (providerStatus: string) =>
    ref.update({
      "billing.status": "ended",
      "billing.providerStatus": providerStatus,
      "billing.statusSince": new Date().toISOString(),
      "billing.currentPeriodEnd": new Date().toISOString(),
      "billing.updatedAt": FieldValue.serverTimestamp(),
    });

  if (TERMINAL.has(live.status)) {
    if (billing.status !== "ended") await markEnded(live.status);
    parts.push(`subscription already ${live.status}`);
  } else {
    if (refusePaid && live.status === "active") throw new PaidAgain(subId);
    try {
      const sub = await cancelSubscriptionNow(subId);
      await markEnded(sub.status);
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
        const r = await refundPayment(last.paymentId);
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
    const live = await fetchSubscription(billing.subscriptionId).catch(() => null);
    if (live && TERMINAL.has(live.status)) return `subscription ${billing.subscriptionId} already ${live.status}`;
    if (live?.status === "created" || (!live && billing.status === "pending")) {
      console.warn(`[billing] could not cancel unpaid ${billing.subscriptionId}`, e);
      return `unpaid checkout ${billing.subscriptionId} left to expire`;
    }
    throw e;
  }
}
