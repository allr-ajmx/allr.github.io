import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { enqueueInTransaction, enqueueOp, queueRef } from "./provisioning";
import { shipLog } from "./logship";
import {
  cancelSubscriptionAtCycleEnd,
  fetchSubscriptionOrMissing,
  isMissingOnRazorpay,
  planOf,
  type RazorpayError,
  type RzpSubscription,
} from "./razorpay";
import { applyMonthlyGrant, ledgerFromDoc, queueChange } from "@/lib/billing/credits";
import { LEGACY_PLAN } from "@/lib/billing/plans";
import { decide, missing, type Intent, type SubscriptionState } from "@/lib/billing/core";
import type { PlanCurrency } from "@/lib/billing/model";
import { billingFromDoc } from "@/lib/billing/records";

/**
 * The ONE writer of an account's subscription state.
 *
 * Every caller — the webhook, the reconciler, checkout, cancel, removal —
 * says "this subscription may have changed". This fetches Razorpay's current
 * view of it (the webhook payload is only a fallback when Razorpay can't be
 * reached), hands it to the pure core with what the account looks like, and
 * writes the decision and its effects in one transaction. Idempotent by
 * construction: the same Razorpay state applied twice changes nothing.
 */

const USERS = "users";
const EVENTS = "billing_events";

export type SyncSource = "webhook" | "reconcile" | "checkout" | "cancel" | "removal";
export type SyncOutcome = "applied" | "unchanged" | "stale" | "unmatched";

export type SyncOptions = {
  source: SyncSource;
  /** The webhook event name, if any — only "subscription.charged" matters, and only for older records. */
  eventName?: string;
  intent?: Intent;
  /** The account we expect it to belong to (checkout knows; webhooks may not). */
  uidHint?: string;
  /** Currency of the plan, when the caller knows it (checkout). */
  planCurrency?: PlanCurrency;
};


/** Razorpay's current state of the subscription; the payload only if Razorpay is unreachable. */
async function currentState(id: string, payload?: RzpSubscription): Promise<RzpSubscription | SubscriptionState> {
  try {
    return (await fetchSubscriptionOrMissing(id)) ?? missing(id);
  } catch (e) {
    if (payload) return payload; // signed by Razorpay; good enough when its API is down
    throw e;
  }
}

async function accountFor(sub: { id: string; notes?: Record<string, string> | null }, uidHint?: string) {
  const db = adminDb();
  for (const uid of [uidHint, sub.notes?.uid].filter((x): x is string => Boolean(x))) {
    const ref = db.collection(USERS).doc(uid);
    if ((await ref.get()).exists) return ref;
  }
  // notes.uid is stamped at creation; an account can move to a new uid
  // afterwards (email transfer). The subscription id is stable.
  const moved = await db.collection(USERS).where("billing.subscriptionId", "==", sub.id).limit(1).get();
  if (moved.docs[0]) return moved.docs[0].ref;
  const changing = await db.collection(USERS).where("billing.upcoming.subscriptionId", "==", sub.id).limit(1).get();
  return changing.docs[0]?.ref ?? null;
}

export async function syncSubscription(
  subscriptionId: string,
  opts: SyncOptions,
  payload?: RzpSubscription,
): Promise<SyncOutcome> {
  const state = await currentState(subscriptionId, payload);
  const notes = "notes" in state ? (state as RzpSubscription).notes : payload?.notes;
  const userRef = await accountFor({ id: subscriptionId, notes }, opts.uidHint);
  const db = adminDb();

  if (!userRef) {
    // A closing event for an account we deleted (we cancel before deleting)
    // is expected; anything else is money we can't place — flag it.
    const closing = ["cancelled", "completed", "expired", "missing"].includes(state.status);
    await db.collection(EVENTS).doc(`unmatched:${subscriptionId}:${state.status}`).set({
      eventName: opts.eventName ?? `sync:${opts.source}`,
      subscriptionId,
      uid: notes?.uid ?? null,
      outcome: closing ? "ignored-closed" : "ignored",
      reason: "no account for this subscription",
      flag: !closing,
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
    if (!closing) shipLog("billing", "subscription matches no account", { subscriptionId, source: opts.source }, "error");
    return "unmatched";
  }

  const result = await db.runTransaction(async (tx) => {
    const [user, queue] = await Promise.all([tx.get(userRef), tx.get(queueRef(userRef.id))]);
    const data = user.data();
    if (!data) return { outcome: "unmatched" as const };
    const prior = billingFromDoc(data.billing);
    const known = planOf("plan_id" in state ? (state as RzpSubscription).plan_id : undefined);
    const decision = decide(
      prior,
      state,
      {
        hasWorkspace: Boolean(String(data.workspace_username ?? "").trim()),
        pendingUsername: String(data.pending_workspace_username ?? "").trim() || null,
        suspended: data.enforcement?.status === "suspended",
      },
      {
        planCurrency: known?.currency ?? opts.planCurrency ?? prior?.planCurrency ?? "USD",
        plan: known?.plan ?? prior?.plan ?? LEGACY_PLAN,
        intent: opts.intent,
        chargeHint: opts.eventName === "subscription.charged",
      },
    );

    if (decision.kind === "stale") {
      tx.set(db.collection(EVENTS).doc(`stale:${subscriptionId}:${state.status}`), {
        eventName: opts.eventName ?? `sync:${opts.source}`,
        subscriptionId,
        uid: userRef.id,
        outcome: "ignored-stale",
        reason: decision.reason,
        flag: false,
        receivedAt: FieldValue.serverTimestamp(),
      });
      return { outcome: "stale" as const };
    }
    if (!decision.changed) return { outcome: "unchanged" as const };

    const { billing, effects } = decision;
    tx.update(userRef, {
      billing: { ...billing, updatedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Every credit consequence composes into ONE ledger write (several
    // tx.update calls on the same field would silently keep only the last).
    const ledger = ledgerFromDoc(data.credits);
    if (ledger && (effects.grantMonth || effects.setIncludedUsd !== null || effects.grantCredit)) {
      let next = effects.grantMonth ? applyMonthlyGrant(ledger) : ledger;
      // Settlement applies a pending month first, then these in order: a new
      // plan's allowance replaces the old one's from this cycle on.
      if (effects.setIncludedUsd !== null) next = queueChange(next, { type: "set_included", usd: effects.setIncludedUsd });
      if (effects.grantCredit) {
        next = queueChange(next, {
          type: "grant",
          grant: { ...effects.grantCredit, note: "upgrade: AI credit for the rest of this cycle" },
        });
      }
      tx.update(userRef, { credits: next });
      if (String(data.workspace_username ?? "").trim()) {
        enqueueOp(tx, { uid: userRef.id, email: data.email, username: data.workspace_username, op: "sync_limit", valueUsd: 0 });
      }
    }
    if (effects.queueBuild) {
      enqueueInTransaction(tx, queue, { uid: userRef.id, email: data.email, username: data.pending_workspace_username });
    }
    if (effects.resume) {
      enqueueOp(tx, { uid: userRef.id, email: data.email, username: data.workspace_username, op: "resume", valueUsd: 0 });
    }

    // The audit trail, one row per distinct state. A reconciler that had to
    // move money or status means a webhook was missed: worth a person's look.
    const statusMoved = prior?.status !== billing.status || prior?.subscriptionId !== billing.subscriptionId;
    const missed = opts.source === "reconcile" && (statusMoved || effects.grantMonth);
    const gone = state.status === "missing";
    tx.set(
      db.collection(EVENTS).doc(
        `${opts.source}:${subscriptionId}:${billing.status}:${billing.paidCount ?? "?"}:${billing.currentPeriodEnd ?? ""}`,
      ),
      {
        eventName: opts.eventName ?? `sync:${opts.source}`,
        subscriptionId,
        uid: userRef.id,
        outcome: missed ? "applied-by-reconcile" : "applied",
        ...(gone
          ? {
              reason: "subscription not found in Razorpay (left over from test mode?) — marked ended",
              flag: prior?.status === "active",
              resolved: false,
            }
          : missed
            ? { reason: "webhook missed — applied from Razorpay", flag: true, resolved: false }
            : { flag: false }),
        receivedAt: FieldValue.serverTimestamp(),
      },
    );
    return { outcome: "applied" as const, billing, effects };
  });

  // Outside the transaction (it calls Razorpay): a plan change whose mandate
  // is set tells the current subscription to end at the renewal date. If this
  // fails, the next sync (the reconciler tracks changes in flight) retries.
  if (result.outcome === "applied" && result.effects.cancelCurrentAtPeriodEnd) {
    const currentId = result.effects.cancelCurrentAtPeriodEnd;
    try {
      await cancelSubscriptionAtCycleEnd(currentId);
    } catch (e) {
      // Already ended / unknown to Razorpay: it won't renew either way.
      if (!isMissingOnRazorpay(e) && !/not cancellable|already/i.test((e as RazorpayError)?.description ?? "")) throw e;
    }
    await db.runTransaction(async (tx) => {
      const fresh = billingFromDoc((await tx.get(userRef)).data()?.billing);
      if (fresh?.subscriptionId === currentId && fresh.upcoming) {
        tx.update(userRef, { "billing.upcoming.oldCancelled": true });
      }
    });
    shipLog("billing", "plan change scheduled: current subscription ends at renewal", { uid: userRef.id, sub: currentId });
  }

  if (result.outcome === "applied") {
    shipLog("billing", `subscription ${result.billing.status}`, {
      uid: userRef.id,
      sub: subscriptionId,
      source: opts.source,
      grant: result.effects.grantMonth,
      build: result.effects.queueBuild,
    }, result.billing.status === "pastDue" ? "warn" : "info");
  }
  return result.outcome;
}
