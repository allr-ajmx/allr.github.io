import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { applyWebhookEvent } from "./billing";
import { applyTopupPayment } from "./credits";
import { applyRefund } from "./payments";
import { RazorpayError, fetchSubscriptionOrMissing, listPayments, listRefunds } from "./razorpay";
import { shipLog } from "./logship";
import { isOrderPayment, missedSubscriptionEvent } from "@/lib/billing/reconcile";

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
 */

const WINDOW_S = 3 * 86_400;
const MAX_PAGES = 3;
const MAX_TOPUPS = 15;
const MAX_SUBS = 20;

export type ReconcileSummary = {
  topups: Record<string, number>;
  refunds: Record<string, number>;
  subscriptions: { checked: number; applied: number; quiet: number; missing?: number };
  errors: string[];
};

const bump = (m: Record<string, number>, k: string) => (m[k] = (m[k] ?? 0) + 1);

/** An error in words an admin can act on — Razorpay's own reason when it has one. */
const why = (e: unknown) =>
  e instanceof RazorpayError
    ? `Razorpay ${e.upstreamStatus}${e.upstreamCode ? ` ${e.upstreamCode}` : ""}: ${e.description || "no detail"}`
    : ((e as Error)?.message ?? String(e)).slice(0, 300);

/** The run, as a sentence for the Needs-attention list. */
function describe(s: ReconcileSummary): string {
  const done: string[] = [];
  if (s.topups.applied) done.push(`${s.topups.applied} missed credit pack(s) applied`);
  if (s.topups.refunded) done.push(`${s.topups.refunded} credit pack(s) refunded automatically`);
  if (s.topups["refund-failed"]) done.push(`${s.topups["refund-failed"]} automatic refund(s) FAILED`);
  if (s.refunds.applied) done.push(`${s.refunds.applied} refund(s) applied`);
  if (s.subscriptions.applied) done.push(`${s.subscriptions.applied} missed subscription update(s) applied`);
  if (s.subscriptions.missing) done.push(`${s.subscriptions.missing} test-mode subscription(s) marked ended`);
  const head = done.length ? `Billing check: ${done.join("; ")}.` : "Billing check:";
  return s.errors.length
    ? `${head} ${s.errors.length} problem(s) — ${s.errors.join(" · ")}`
    : head;
}

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

  // 3. Subscriptions whose state moved without us hearing. The least
  //    recently checked first, a capped batch per run, so all get a turn.
  try {
    const tracked = await db
      .collection("users")
      .where("billing.status", "in", ["pending", "active", "pastDue"])
      .limit(500)
      .get();
    const batch = tracked.docs
      .filter((d) => d.data().billing?.subscriptionId)
      .sort((a, b) => String(a.data().billing?.reconciledAt ?? "").localeCompare(String(b.data().billing?.reconciledAt ?? "")))
      .slice(0, MAX_SUBS);
    for (const doc of batch) {
      const b = doc.data().billing;
      try {
        const live = await fetchSubscriptionOrMissing(b.subscriptionId);
        summary.subscriptions.checked++;
        if (!live) {
          // Razorpay doesn't know this id — typically a subscription created
          // in test mode before the keys went live. It can't charge anyone:
          // record it as ended (once) so nothing keeps asking about it.
          await doc.ref.update({
            "billing.status": "ended",
            "billing.providerStatus": "missing",
            "billing.statusSince": now.toISOString(),
            "billing.reconciledAt": now.toISOString(),
          });
          await db.collection("billing_events").doc(`missing:${b.subscriptionId}`).set({
            eventName: "reconcile",
            uid: doc.id,
            subscriptionId: b.subscriptionId,
            outcome: "marked-ended",
            reason: "subscription not found in Razorpay (left over from test mode?) — marked ended",
            flag: b.status === "active",
            resolved: false,
            receivedAt: FieldValue.serverTimestamp(),
          });
          summary.subscriptions.missing = (summary.subscriptions.missing ?? 0) + 1;
          continue;
        }
        const event = missedSubscriptionEvent(
          { providerStatus: b.providerStatus ?? null, paidCount: b.paidCount ?? null, currentPeriodEnd: b.currentPeriodEnd ?? null },
          live,
        );
        if (event) {
          // A real miss (money or status moved) is flagged; a renewal date
          // that merely moved is applied quietly.
          const real = event === "subscription.charged" || (b.providerStatus ?? null) !== live.status;
          await applyWebhookEvent(
            `${real ? "reconcile" : "quiet"}:${live.id}:${live.status}:${live.paid_count ?? "?"}:${live.current_end ?? ""}`,
            event,
            live,
            { source: real ? "reconcile" : "webhook" },
          );
          if (real) summary.subscriptions.applied++;
          else summary.subscriptions.quiet++;
        }
        await doc.ref.update({ "billing.reconciledAt": now.toISOString() });
      } catch (e) {
        summary.errors.push(`subscription ${b.subscriptionId}: ${why(e)}`);
      }
    }
  } catch (e) {
    summary.errors.push(`listing subscriptions: ${why(e)}`);
  }

  const applied =
    (summary.topups.applied ?? 0) + (summary.topups.refunded ?? 0) + (summary.refunds.applied ?? 0) +
    summary.subscriptions.applied;
  if (applied || summary.errors.length) {
    shipLog("billing", applied ? "reconcile applied missed events" : "reconcile had errors",
      { summary: JSON.stringify(summary) }, summary.errors.length ? "error" : "warn");
    // One row per hour, so a persistent failure is one flag, not twelve.
    await db.collection("billing_events").doc(`reconcile-run:${now.toISOString().slice(0, 13)}`).set({
      eventName: "reconcile",
      outcome: summary.errors.length ? "errors" : "applied",
      reason: describe(summary).slice(0, 1500),
      flag: summary.errors.length > 0,
      resolved: false,
      receivedAt: FieldValue.serverTimestamp(),
    });
  }
  return summary;
}
