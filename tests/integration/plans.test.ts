/**
 * Workspace subscription and the separate monthly AI-credit subscription.
 * A workspace charge grants no credit. Credit is quantity on a $1 plan,
 * rolls over, and an amount change replaces the one credit subscription.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { caller, freshRazorpay, list, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => { await resetDb(); rzp.subscriptions.clear(); rzp.payments.clear(); rzp.calls.length = 0; });

const U = { uid: "u1", email: "k@example.com" };

async function subscribeWorkspace() {
  await seedUser(U.uid, U.email, { ws: "kamal" });
  const { startSubscription } = await import("@/lib/server/billing");
  const { subscriptionId } = await startSubscription(caller(U.uid, U.email), undefined, 0);
  rzp.charge(subscriptionId);
  await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
  return subscriptionId;
}

describe("workspace subscription", () => {
  it("sells the workspace plan and grants no AI credit", async () => {
    const subId = await subscribeWorkspace();
    assert.equal(rzp.subscriptions.get(subId)?.plan_id, "plan_ws_inr");
    const u = await read("users/u1");
    assert.equal(u?.billing.plan, "workspace");
    assert.equal(u?.credits, undefined);
  });

  it("a live workspace can buy a pack at face value", async () => {
    await subscribeWorkspace();
    const { initialLedger } = await import("@/lib/billing/credits");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ credits: initialLedger() });
    const { startTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    assert.equal(order.creditUsd, 10);
  });
});

describe("monthly AI credit", () => {
  it("opens one subscription whose quantity is the dollar amount and adds it when charged", async () => {
    await subscribeWorkspace();
    const { startCreditSubscription } = await import("@/lib/server/billing");
    const opened = await startCreditSubscription(caller(U.uid, U.email), 20);
    const created = rzp.calls.find((c) => c.path === "/subscriptions" && c.body?.notes && (c.body.notes as { kind?: string }).kind === "credits");
    assert.equal(created?.body?.quantity, 20);
    assert.equal(rzp.subscriptions.get(opened.subscriptionId)?.plan_id, "plan_credit_inr");
    rzp.charge(opened.subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(opened.subscriptionId)! });
    let u = await read("users/u1");
    assert.equal(u?.creditSubscription.amountUsd, 20);
    assert.equal(u?.creditSubscription.status, "active");
    assert.equal(u?.credits.purchasedUsd, 20);

    rzp.charge(opened.subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(opened.subscriptionId)! });
    u = await read("users/u1");
    assert.equal(u?.credits.purchasedUsd, 40);
  });

  it("changing the amount schedules one replacement and does not reset the balance", async () => {
    await subscribeWorkspace();
    const { startCreditSubscription } = await import("@/lib/server/billing");
    const first = await startCreditSubscription(caller(U.uid, U.email), 20);
    rzp.charge(first.subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(first.subscriptionId)! });

    const next = await startCreditSubscription(caller(U.uid, U.email), 35);
    assert.ok(next.startsAt);
    assert.equal((await read("users/u1"))?.creditSubscription.amountUsd, 20);
    assert.equal((await read("users/u1"))?.creditSubscription.upcoming.amountUsd, 35);
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 20);

    rzp.authenticate(next.subscriptionId);
    await webhook("subscription.authenticated", { subscription: rzp.subscriptions.get(next.subscriptionId)! });
    assert.equal((await read("users/u1"))?.creditSubscription.upcoming.oldCancelled, true);

    rzp.start(next.subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(next.subscriptionId)! });
    const u = await read("users/u1");
    assert.equal(u?.creditSubscription.subscriptionId, next.subscriptionId);
    assert.equal(u?.creditSubscription.amountUsd, 35);
    assert.equal(u?.creditSubscription.upcoming, null);
    assert.equal(u?.credits.purchasedUsd, 55);
  });

  it("a credit charge no webhook reported is applied by the reconciler, flagged, once", async () => {
    await subscribeWorkspace();
    const { startCreditSubscription } = await import("@/lib/server/billing");
    const opened = await startCreditSubscription(caller(U.uid, U.email), 20);
    rzp.charge(opened.subscriptionId); // paid; the webhook never comes
    const r = await worker("reconcile");
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.errors, []);
    assert.equal(r.body.subscriptions.applied, 1);
    let u = await read("users/u1");
    assert.equal(u?.creditSubscription.status, "active");
    assert.equal(u?.credits.purchasedUsd, 20);
    const flagged = (await list("billing_events")).filter(
      (e) => (e as { outcome?: string }).outcome === "applied-by-reconcile" && e.id.startsWith("credit:reconcile:"),
    ) as Array<{ flag?: boolean; reason?: string }>;
    assert.equal(flagged.length, 1);
    assert.equal(flagged[0].flag, true);
    assert.match(String(flagged[0].reason), /\$20 monthly AI credit/);

    await worker("reconcile");
    u = await read("users/u1");
    assert.equal(u?.credits.purchasedUsd, 20);
  });

  it("an amount change in flight is followed by the reconciler", async () => {
    await subscribeWorkspace();
    const { startCreditSubscription } = await import("@/lib/server/billing");
    const first = await startCreditSubscription(caller(U.uid, U.email), 20);
    rzp.charge(first.subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(first.subscriptionId)! });

    const next = await startCreditSubscription(caller(U.uid, U.email), 35);
    rzp.authenticate(next.subscriptionId); // mandate set; no webhook
    await worker("reconcile");
    assert.equal((await read("users/u1"))?.creditSubscription.upcoming.oldCancelled, true);

    rzp.start(next.subscriptionId); // renewal date; still no webhook
    const r = await worker("reconcile");
    assert.deepEqual(r.body.errors, []);
    const u = await read("users/u1");
    assert.equal(u?.creditSubscription.subscriptionId, next.subscriptionId);
    assert.equal(u?.creditSubscription.amountUsd, 35);
    assert.equal(u?.credits.purchasedUsd, 55);
  });

  it("checkout confirm applies a credit charge without waiting for the webhook", async () => {
    await subscribeWorkspace();
    const { confirmCheckout, startCreditSubscription } = await import("@/lib/server/billing");
    const opened = await startCreditSubscription(caller(U.uid, U.email), 5);
    rzp.charge(opened.subscriptionId);
    const summary = await confirmCheckout(caller(U.uid, U.email), opened.subscriptionId);
    assert.equal(summary.creditSubscription?.status, "active");
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 5);
  });

  it("refuses credit before the workspace is paid for", async () => {
    await seedUser(U.uid, U.email, { ws: "kamal" });
    const { startCreditSubscription } = await import("@/lib/server/billing");
    await assert.rejects(startCreditSubscription(caller(U.uid, U.email), 20), /workspace/i);
  });
});
