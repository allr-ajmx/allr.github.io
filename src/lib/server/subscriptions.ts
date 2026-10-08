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
import { addPurchased, initialLedger, ledgerFromDoc, queueChange } from "@/lib/billing/credits";
import { LEGACY_PLAN } from "@/lib/billing/plans";
import { decide, decideCredit, missing, type DecideOptions, type Intent, type SubscriptionState } from "@/lib/billing/core";
import type { PlanCurrency } from "@/lib/billing/model";
import { billingFromDoc, creditSubscriptionFromDoc } from "@/lib/billing/records";

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
  if (notes?.kind === "credits") {
    return syncCreditSubscription(subscriptionId, state, notes, opts);
  }
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
    const known = planOf("plan_id" in state ? (state as RzpSubscription).plan_id : undefined, notes);
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
        ...billingNotes(notes),
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
    let ledger = ledgerFromDoc(data.credits);
    let ledgerMoved = false;
    // The monthly AI credit bought with the workspace: added on each paid
    // cycle. Before the workspace exists the ledger is opened here; the
    // stamp keeps it and brings the new key's limit to it.
    if (effects.addCreditUsd > 0) {
      ledger = addPurchased(ledger ?? initialLedger(), effects.addCreditUsd);
      ledgerMoved = true;
    }
    // A legacy plan-change grant lands on the purchased balance when it settles.
    if (ledger && effects.grantCredit) {
      ledger = queueChange(ledger, {
        type: "grant",
        grant: { ...effects.grantCredit, note: "upgrade: AI credit for the rest of this cycle" },
      });
      ledgerMoved = true;
    }
    if (ledger && ledgerMoved) {
      tx.update(userRef, { credits: ledger });
      if (String(data.workspace_username ?? "").trim()) {
        enqueueOp(tx, {
          uid: userRef.id,
          email: data.email,
          username: data.workspace_username,
          op: "sync_limit",
          valueUsd: ledger.targetLimitUsd,
        });
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
            ? {
                reason: effects.addCreditUsd > 0
                  ? `webhook missed — applied from Razorpay, with $${effects.addCreditUsd} monthly AI credit`
                  : "webhook missed — applied from Razorpay",
                flag: true,
                resolved: false,
              }
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
      creditUsd: result.effects.addCreditUsd,
      build: result.effects.queueBuild,
    }, result.billing.status === "pastDue" ? "warn" : "info");
  }
  return result.outcome;
}

/** What a priced-at-checkout subscription's notes say about its credit and bill. */
function billingNotes(notes: Record<string, string> | null | undefined): Pick<DecideOptions, "creditUsd" | "bill"> {
  if (!notes || notes.kind !== "workspace") return {};
  const n = (k: string) => (notes[k] !== undefined && Number.isFinite(Number(notes[k])) ? Number(notes[k]) : null);
  const credit = n("credit_usd");
  const total = n("total_minor");
  return {
    ...(credit !== null && credit >= 0 ? { creditUsd: credit } : {}),
    ...(total !== null && (notes.currency === "USD" || notes.currency === "INR")
      ? {
          bill: {
            currency: notes.currency,
            subtotalMinor: n("subtotal_minor") ?? total,
            taxMinor: n("tax_minor") ?? 0,
            taxRate: n("tax_rate") ?? 0,
            totalMinor: total,
            fxRate: n("fx_rate") ?? 1,
          },
        }
      : {}),
  };
}

async function creditAccountFor(
  sub: { id: string; notes?: Record<string, string> | null },
  uidHint?: string,
) {
  const db = adminDb();
  for (const uid of [uidHint, sub.notes?.uid].filter((x): x is string => Boolean(x))) {
    const ref = db.collection(USERS).doc(uid);
    if ((await ref.get()).exists) return ref;
  }
  const current = await db.collection(USERS).where("creditSubscription.subscriptionId", "==", sub.id).limit(1).get();
  if (current.docs[0]) return current.docs[0].ref;
  const changing = await db.collection(USERS).where("creditSubscription.upcoming.subscriptionId", "==", sub.id).limit(1).get();
  return changing.docs[0]?.ref ?? null;
}

/**
 * The monthly AI-credit subscription. A paid cycle adds its dollar amount to
 * the ledger. An amount change lives on `creditSubscription.upcoming` until
 * it takes over; the purchased balance is never reset.
 */
async function syncCreditSubscription(
  subscriptionId: string,
  state: RzpSubscription | SubscriptionState,
  notes: Record<string, string> | undefined,
  opts: SyncOptions,
): Promise<SyncOutcome> {
  const userRef = await creditAccountFor({ id: subscriptionId, notes }, opts.uidHint);
  const db = adminDb();
  if (!userRef) {
    await db.collection(EVENTS).doc(`unmatched-credit:${subscriptionId}:${state.status}`).set({
      eventName: opts.eventName ?? `sync:${opts.source}`,
      subscriptionId,
      uid: notes?.uid ?? null,
      outcome: "ignored",
      reason: "no account for this credit subscription",
      flag: true,
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
    return "unmatched";
  }

  const result = await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    const data = user.data();
    if (!data) return { outcome: "unmatched" as const };
    const prior = creditSubscriptionFromDoc(data.creditSubscription);
    const amountFromNotes = Number(notes?.amount_usd);
    const amountUsd = Number.isFinite(amountFromNotes) && amountFromNotes > 0
      ? amountFromNotes
      : (prior?.amountUsd ?? 0);
    const decision = decideCredit(prior, state, {
      currency: prior?.currency ?? opts.planCurrency ?? "USD",
      amountUsd,
      intent: opts.intent,
      chargeHint: opts.eventName === "subscription.charged",
    });
    if (decision.kind === "stale") return { outcome: "stale" as const };
    if (!decision.changed) return { outcome: "unchanged" as const };

    const { subscription, effects } = decision;
    tx.update(userRef, {
      creditSubscription: { ...subscription, updatedAt: FieldValue.serverTimestamp() },
      ...(effects.addUsd > 0 ? { pending_credit_usd: 0 } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (effects.addUsd > 0) {
      const ledger = ledgerFromDoc(data.credits) ?? initialLedger();
      const next = addPurchased(ledger, effects.addUsd);
      tx.update(userRef, { credits: next });
      if (String(data.workspace_username ?? "").trim()) {
        enqueueOp(tx, {
          uid: userRef.id,
          email: data.email,
          username: data.workspace_username,
          op: "sync_limit",
          valueUsd: next.targetLimitUsd,
        });
      }
    }
    // Same rule as the workspace path: the reconciler moving money or
    // status means a webhook was missed — worth a person's look.
    const statusMoved = prior?.status !== subscription.status || prior?.subscriptionId !== subscription.subscriptionId;
    const missed = opts.source === "reconcile" && (statusMoved || effects.addUsd > 0);
    tx.set(db.collection(EVENTS).doc(
      `credit:${opts.source}:${subscriptionId}:${subscription.status}:${subscription.paidCount ?? "?"}`,
    ), {
      eventName: opts.eventName ?? `sync:${opts.source}`,
      subscriptionId,
      uid: userRef.id,
      outcome: missed ? "applied-by-reconcile" : "applied",
      ...(missed
        ? {
            reason: effects.addUsd > 0
              ? `webhook missed — $${effects.addUsd} monthly AI credit applied from Razorpay`
              : "webhook missed — credit subscription update applied from Razorpay",
            flag: true,
            resolved: false,
          }
        : { flag: false }),
      receivedAt: FieldValue.serverTimestamp(),
    });
    return { outcome: "applied" as const, effects, subscription };
  });

  if (result.outcome === "applied" && result.effects.cancelCurrentAtPeriodEnd) {
    const currentId = result.effects.cancelCurrentAtPeriodEnd;
    try {
      await cancelSubscriptionAtCycleEnd(currentId);
    } catch (e) {
      if (!isMissingOnRazorpay(e) && !/not cancellable|already/i.test((e as RazorpayError)?.description ?? "")) throw e;
    }
    await db.runTransaction(async (tx) => {
      const fresh = creditSubscriptionFromDoc((await tx.get(userRef)).data()?.creditSubscription);
      if (fresh?.subscriptionId === currentId && fresh.upcoming) {
        tx.update(userRef, { "creditSubscription.upcoming.oldCancelled": true });
      }
    });
  }
  return result.outcome;
}
