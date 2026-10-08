import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { syncSubscription } from "./subscriptions";
import { applyTopupPayment } from "./credits";
import { applyRefund } from "./payments";
import { RazorpayError, listPayments, listRefunds } from "./razorpay";
import { shipLog } from "./logship";
import {
  appliedCount,
  describeRun,
  isOrderPayment,
  webhookSilence,
  type ReconcileSummary,
} from "@/lib/billing/reconcile";

/**
 * The safety net under the webhooks. Every few minutes the VPS worker calls
 * this; it reads recent payments, refunds and the subscriptions we track
 * straight from Razorpay and applies anything our records don't reflect,
 * through the very same appliers the webhooks use (all idempotent). Whatever
 * it had to apply is flagged "webhook missed", which is the alert that the
 * webhook path is broken.
 *
 * Bounded per run so a slow Razorpay can't hold the function: a window of
 * three days, a capped number of pages, order lookups and subscriptions.
 *
 * Subscriptions are of two kinds since the split: the workspace one
 * (`billing`) and the optional monthly AI-credit one (`creditSubscription`).
 * Both are followed, sharing one per-run budget; syncSubscription routes each
 * by its Razorpay notes.
 */

const WINDOW_S = 3 * 86_400;
const MAX_PAGES = 3;
const MAX_TOPUPS = 15;
const MAX_SUBS = 20;

export type { ReconcileSummary };

const LIVE = ["pending", "active", "pastDue"];
const IN_FLIGHT = ["created", "authenticated"];
type SubField = "billing" | "creditSubscription";

const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);

/** An error in words an admin can act on — Razorpay's own reason when it has one. */
const why = (e: unknown) =>
  e instanceof RazorpayError
    ? `Razorpay ${e.upstreamStatus}${e.upstreamCode ? ` ${e.upstreamCode}` : ""}: ${e.description || "no detail"}`
    : ((e as Error)?.message ?? String(e)).slice(0, 300);

async function pages<T>(fetchPage: (skip: number) => Promise<{ items?: T[] }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = (await fetchPage(i * 100)).items ?? [];
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

export async function reconcile(now = new Date()): Promise<ReconcileSummary> {
  const db = adminDb();
  const to = Math.floor(now.getTime() / 1000);
  const from = to - WINDOW_S;
  const summary: ReconcileSummary = {
    topups: {},
    refunds: {},
    subscriptions: { checked: 0, applied: 0, quiet: 0 },
    errors: [],
  };

  // 1. Credit-pack payments we never applied (webhook missed) or never
  //    captured (authorized only). Already-recorded ones are skipped cheaply.
  try {
    const payments = (await pages((skip) => listPayments(from, to, skip))).filter(
      (p) => isOrderPayment(p) && (p.status === "captured" || p.status === "authorized"),
    );
    // Skip what's recorded as a purchase, and what an earlier pass already
    // found isn't a top-up (e.g. a subscription's card-authorization payment),
    // so those can't crowd real top-ups out of the per-run cap.
    const refs = payments.flatMap((p) => [
      db.collection("credit_purchases").doc(p.id),
      db.collection("reconcile_seen").doc(p.id),
    ]);
    const known = refs.length ? await db.getAll(...refs) : [];
    const todo = payments.filter((_, i) => !known[2 * i].exists && !known[2 * i + 1].exists).slice(0, MAX_TOPUPS);
    for (const p of todo) {
      try {
        const outcome = await applyTopupPayment(p, `reconcile:${p.id}`, { source: "reconcile" });
        bump(summary.topups, outcome);
        if (outcome === "ignored") {
          await db.collection("reconcile_seen").doc(p.id).set({ kind: "not-a-topup", at: FieldValue.serverTimestamp() });
        }
      } catch (e) {
        summary.errors.push(`payment ${p.id}: ${why(e)}`);
      }
    }
  } catch (e) {
    summary.errors.push(`listing payments: ${why(e)}`);
  }

  // 2. Refunds we never heard about.
  try {
    const refunds = (await pages((skip) => listRefunds(from, to, skip))).filter((r) => r.status !== "failed");
    const seen = refunds.length
      ? await db.getAll(...refunds.map((r) => db.collection("billing_events").doc(`refund:${r.id}`)))
      : [];
    for (const r of refunds.filter((_, i) => !seen[i].exists)) {
      try {
        bump(summary.refunds, await applyRefund(r, { source: "reconcile" }));
      } catch (e) {
        summary.errors.push(`refund ${r.id}: ${why(e)}`);
      }
    }
  } catch (e) {
    summary.errors.push(`listing refunds: ${why(e)}`);
  }

  // 3. Subscriptions whose state moved without us hearing — the workspace
  //    one and the monthly AI-credit one. The least recently checked first,
  //    a capped batch per run, so all get a turn.
  try {
    const users = db.collection("users");
    const [tracked, changing, credit, creditChanging] = await Promise.all([
      users.where("billing.status", "in", LIVE).limit(500).get(),
      users.where("billing.upcoming.status", "in", IN_FLIGHT).limit(200).get(),
      users.where("creditSubscription.status", "in", LIVE).limit(500).get(),
      users.where("creditSubscription.upcoming.status", "in", IN_FLIGHT).limit(200).get(),
    ]);
    // A change in flight (plan or credit amount): its new subscription is
    // followed too (mandate set, takeover at renewal, the old one told to end).
    const inFlight = [
      ...changing.docs.map((doc) => ({ doc, what: "plan change", id: doc.data().billing?.upcoming?.subscriptionId })),
      ...creditChanging.docs.map((doc) => ({ doc, what: "credit change", id: doc.data().creditSubscription?.upcoming?.subscriptionId })),
    ];
    for (const { doc, what, id } of inFlight) {
      if (typeof id !== "string" || !id) continue;
      try {
        await syncSubscription(id, { source: "reconcile", uidHint: doc.id });
      } catch (e) {
        summary.errors.push(`${what} ${id}: ${why(e)}`);
      }
    }
    const checkedAt = (doc: (typeof tracked.docs)[number], field: SubField) =>
      String(doc.data()[field]?.reconciledAt ?? "");
    const batch = [
      ...tracked.docs.map((doc) => ({ doc, field: "billing" as SubField })),
      ...credit.docs.map((doc) => ({ doc, field: "creditSubscription" as SubField })),
    ]
      .filter(({ doc, field }) => doc.data()[field]?.subscriptionId)
      .sort((a, b) => checkedAt(a.doc, a.field).localeCompare(checkedAt(b.doc, b.field)))
      .slice(0, MAX_SUBS);
    for (const { doc, field } of batch) {
      const b = doc.data()[field];
      try {
        const outcome = await syncSubscription(b.subscriptionId, { source: "reconcile", uidHint: doc.id });
        summary.subscriptions.checked++;
        const after = (await doc.ref.get()).data()?.[field];
        if (outcome === "applied") {
          if (after?.providerStatus === "missing") summary.subscriptions.missing = (summary.subscriptions.missing ?? 0) + 1;
          else if (after?.status !== b.status || (after?.paidCount ?? 0) > (b.paidCount ?? 0)) summary.subscriptions.applied++;
          else summary.subscriptions.quiet++;
        }
        await doc.ref.update({ [`${field}.reconciledAt`]: now.toISOString() });
      } catch (e) {
        summary.errors.push(`${field === "billing" ? "subscription" : "credit subscription"} ${b.subscriptionId}: ${why(e)}`);
      }
    }
  } catch (e) {
    summary.errors.push(`listing subscriptions: ${why(e)}`);
  }

  // Applying what webhooks missed, with no webhook verified for a while,
  // means the webhook path itself is down: say that once, up front.
  const applied = appliedCount(summary);
  if (applied) {
    try {
      const health = (await db.collection("billing_health").doc("webhook").get()).data();
      const silent = webhookSilence(typeof health?.lastVerifiedAt === "string" ? health.lastVerifiedAt : null, now);
      if (silent) summary.webhookSilentSince = silent;
    } catch {
      // Only a hint for the alert; never a reason for the run to fail.
    }
  }
  if (applied || summary.errors.length) {
    shipLog("billing", applied ? "reconcile applied missed events" : "reconcile had errors",
      { summary: JSON.stringify(summary) }, summary.errors.length ? "error" : "warn");
    // One row per hour, so a persistent failure is one flag, not twelve.
    await db.collection("billing_events").doc(`reconcile-run:${now.toISOString().slice(0, 13)}`).set({
      eventName: "reconcile",
      outcome: summary.errors.length ? "errors" : summary.webhookSilentSince ? "webhook-silent" : "applied",
      reason: describeRun(summary).slice(0, 1500),
      flag: summary.errors.length > 0 || Boolean(summary.webhookSilentSince),
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
  }
  return summary;
}
