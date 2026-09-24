import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import { reserveUsername } from "./provisioning";
import { readOrAdoptProfile } from "./profiles";
import type { Caller } from "./session";
import { enqueueInTransaction, queueRef, readQueue } from "./provisioning";
import {
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
      !workspace && profile.billing ? await readQueue(profile.uid) : null,
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
): Omit<Billing, "updatedAt"> {
  return {
    status: normalizeProviderStatus(sub.status),
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
        await writeBilling(caller.uid, billingFrom(sub, existing.planCurrency, existing.customerId));
        return { subscriptionId: sub.id, keyId: razorpayKeyId(), plan };
      }
    }
  }

  const customer = await createCustomer(profile.name, caller.email);
  const sub = await createSubscription(planIdFor(currency), customer.id, caller.uid);
  await writeBilling(caller.uid, billingFrom(sub, currency, customer.id));

  return { subscriptionId: sub.id, keyId: razorpayKeyId(), plan };
}

/** Cancel at the end of the paid period — nobody loses time they paid for. */
export async function cancelSubscription(caller: Caller): Promise<Billing> {
  const profile = await readOrAdoptProfile(caller);
  const billing = profile?.billing;
  if (!profile || !billing || billing.status === "ended") {
    throw badRequest("not-subscribed", "There is no subscription to cancel.");
  }

  const sub = await cancelSubscriptionAtCycleEnd(billing.subscriptionId);
  const next = billingFrom(sub, billing.planCurrency, billing.customerId);
  // Razorpay reports `cancelled` only at cycle end; until then the person
  // stays `active` with an end date, which is exactly what the UI should say.
  await writeBilling(caller.uid, next);
  return { ...next, updatedAt: new Date().toISOString() };
}

/**
 * A webhook delivery. The signature has already been verified; this applies
 * the event exactly once, keyed by Razorpay's event id, and maps it to a
 * person through `notes.uid` stamped at creation.
 */
export async function applyWebhookEvent(
  eventId: string,
  eventName: string,
  subscription: RzpSubscription | undefined,
): Promise<"applied" | "duplicate" | "ignored"> {
  if (!eventName.startsWith("subscription.") || !subscription) return "ignored";

  const uid = subscription.notes?.uid;
  if (!uid) {
    console.error(`[billing] ${eventName} ${subscription.id} carries no uid note`);
    return "ignored";
  }

  const db = adminDb();
  const eventRef = db.collection(EVENTS).doc(eventId);
  const userRef = db.collection(USERS).doc(uid);

  return db.runTransaction(async (tx) => {
    const [seen, user, queueSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(userRef),
      tx.get(queueRef(uid)),
    ]);
    if (seen.exists) return "duplicate" as const;
    if (!user.exists) {
      console.error(`[billing] ${eventName}: no profile for uid ${uid}`);
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

    tx.update(userRef, {
      billing: {
        status: normalizeProviderStatus(subscription.status),
        planCurrency: prior?.planCurrency ?? "USD",
        subscriptionId: subscription.id,
        customerId: subscription.customer_id ?? prior?.customerId ?? "",
        currentPeriodEnd: subscription.current_end
          ? new Date(subscription.current_end * 1000).toISOString()
          : (prior?.currentPeriodEnd ?? null),
        providerStatus: subscription.status,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    // The moment payment is real, a workspace-less account goes on the queue.
    const data = user.data()!;
    const paid = normalizeProviderStatus(subscription.status) === "active";
    const noWorkspace = !String(data.workspace_username ?? "").trim();
    const pending = String(data.pending_workspace_username ?? "").trim();
    if (paid && noWorkspace && pending) {
      enqueueInTransaction(tx, queueSnap, { uid, email: data.email, username: pending });
    }

    tx.set(eventRef, {
      eventName,
      subscriptionId: subscription.id,
      uid,
      outcome: "applied",
      receivedAt: FieldValue.serverTimestamp(),
    });
    return "applied" as const;
  });
}

export { iso as _isoForTests };
