/**
 * One checkout: the workspace and its monthly AI credit are ONE Razorpay
 * subscription, priced from USD into the payer's currency at the day's rate,
 * plus GST. The credit reaches the ledger on every paid cycle — before the
 * workspace exists, through the stamp, and when only the reconciler saw it.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { caller, freshRazorpay, list, ops, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => {
  await resetDb();
  rzp.subscriptions.clear(); rzp.payments.clear(); rzp.orders.clear(); rzp.plans.clear();
  rzp.calls.length = 0; rzp.fxRate = 90;
});

const U = { uid: "u1", email: "k@example.com" };

async function checkout(creditUsd: number, country = "IN") {
  await seedUser(U.uid, U.email, { country });
  const { startSubscription } = await import("@/lib/server/billing");
  return startSubscription(caller(U.uid, U.email), "kamal", creditUsd);
}

const subscriptionCreations = () => rzp.calls.filter((c) => c.method === "POST" && c.path === "/subscriptions");

describe("one checkout for workspace + AI credit", () => {
  it("India: one subscription for ($10 + $5) at the day's rate + 18% GST", async () => {
    const r = await checkout(5);
    assert.equal(subscriptionCreations().length, 1);
    // $15 at ₹90 = ₹1,350; 18% GST = ₹243; total ₹1,593.
    assert.equal(r.quote.currency, "INR");
    assert.equal(r.quote.subtotalMinor, 1_350_00);
    assert.equal(r.quote.taxMinor, 243_00);
    assert.equal(r.quote.totalMinor, 1_593_00);
    const sub = rzp.subscriptions.get(r.subscriptionId)!;
    assert.equal(rzp.plans.get(sub.plan_id)?.item.amount, 1_593_00);
    assert.equal(rzp.plans.get(sub.plan_id)?.item.currency, "INR");
    assert.equal(sub.notes.kind, "workspace");
    assert.equal(sub.notes.credit_usd, "5");
    const u = await read("users/u1");
    assert.equal(u?.billing.creditUsd, 5);
    assert.equal(u?.billing.plan, "workspace");
    assert.equal(u?.billing.bill.totalMinor, 1_593_00);
    assert.equal(u?.pending_credit_usd, 0);
  });

  it("elsewhere: US dollars + GST, no exchange rate needed", async () => {
    rzp.fxRate = null; // the feed being down must not matter outside India
    const r = await checkout(5, "US");
    assert.equal(r.quote.currency, "USD");
    assert.equal(r.quote.totalMinor, 17_70);
    const sub = rzp.subscriptions.get(r.subscriptionId)!;
    assert.equal(rzp.plans.get(sub.plan_id)?.item.currency, "USD");
  });

  it("paid: active, the build queued, $5 in the ledger before the workspace exists — once", async () => {
    const { subscriptionId } = await checkout(5);
    rzp.charge(subscriptionId);
    const sub = rzp.subscriptions.get(subscriptionId)!;
    await webhook("subscription.activated", { subscription: sub });
    await webhook("subscription.charged", { subscription: sub });
    await webhook("subscription.charged", { subscription: sub }); // redelivered
    const u = await read("users/u1");
    assert.equal(u?.billing.status, "active");
    assert.equal(u?.credits.purchasedUsd, 5);
    assert.equal((await read("provision_queue/u1"))?.status, "queued");
    // No workspace yet: nothing to sync a key limit on.
    assert.equal((await ops()).filter((o) => o.op === "sync_limit").length, 0);
  });

  it("the stamp keeps the $5 and brings the new key's limit to it; each renewal adds $5", async () => {
    const { subscriptionId } = await checkout(5);
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    const stamped = await worker("workspace", {
      email: U.email, username: "kamal", workspaceEmail: U.email, address: "https://kamal.allr.work",
    });
    assert.equal(stamped.status, 200);
    let u = await read("users/u1");
    assert.equal(u?.workspace_username, "kamal");
    assert.equal(u?.credits.purchasedUsd, 5);
    assert.equal((await ops()).filter((o) => o.op === "sync_limit").length, 1);

    rzp.charge(subscriptionId); // next month
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    u = await read("users/u1");
    assert.equal(u?.credits.purchasedUsd, 10);
    assert.equal(u?.credits.targetLimitUsd, 10);
  });

  it("checkout's confirm applies it without the webhook (the test that failed in production)", async () => {
    const { confirmCheckout } = await import("@/lib/server/billing");
    const { subscriptionId } = await checkout(5);
    rzp.charge(subscriptionId);
    const summary = await confirmCheckout(caller(U.uid, U.email), subscriptionId);
    assert.equal(summary.billing?.status, "active");
    assert.equal(summary.billing?.creditUsd, 5);
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 5);
  });

  it("no webhook at all: the reconciler applies the payment and the credit, flagged, once", async () => {
    const { subscriptionId } = await checkout(5);
    rzp.charge(subscriptionId);
    const r = await worker("reconcile");
    assert.deepEqual(r.body.errors, []);
    assert.equal(r.body.subscriptions.applied, 1);
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 5);
    const flagged = (await list("billing_events")).filter(
      (e) => (e as { outcome?: string }).outcome === "applied-by-reconcile",
    ) as Array<{ reason?: string }>;
    assert.match(String(flagged[0]?.reason), /\$5 monthly AI credit/);
    await worker("reconcile");
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 5);
  });

  it("workspace only: no credit added", async () => {
    const { subscriptionId } = await checkout(0);
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    const u = await read("users/u1");
    assert.equal(u?.billing.creditUsd, 0);
    assert.equal(u?.credits, undefined);
  });

  it("reopening the same choice reuses the checkout; a different amount starts a new one", async () => {
    const a = await checkout(5);
    const { startSubscription } = await import("@/lib/server/billing");
    const b = await startSubscription(caller(U.uid, U.email), undefined, 5);
    assert.equal(b.subscriptionId, a.subscriptionId);
    const c = await startSubscription(caller(U.uid, U.email), undefined, 7);
    assert.notEqual(c.subscriptionId, a.subscriptionId);
    assert.equal((await read("users/u1"))?.billing.creditUsd, 7);
  });

  it("the same bill shares one Razorpay plan", async () => {
    await checkout(5);
    await seedUser("u2", "b@example.com", { country: "IN" });
    const { startSubscription } = await import("@/lib/server/billing");
    await startSubscription(caller("u2", "b@example.com"), "bina", 5);
    assert.equal(rzp.plans.size, 1);
    assert.equal((await list("billing_plans")).length, 1);
  });

  it("a separate monthly credit subscription is not offered to new accounts", async () => {
    const { subscriptionId } = await checkout(5);
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    const { startCreditSubscription } = await import("@/lib/server/billing");
    await assert.rejects(startCreditSubscription(caller(U.uid, U.email), 10), /top-up/i);
  });
});

describe("the exchange rate", () => {
  it("is fetched once a day and cached", async () => {
    await checkout(5);
    const { startSubscription } = await import("@/lib/server/billing");
    await startSubscription(caller(U.uid, U.email), undefined, 6);
    assert.equal((await read("billing_fx/USD-INR"))?.rate, 90);
  });

  it("feed down: a recent cached rate is used; none or stale refuses rather than guess", async () => {
    const { adminDb } = await import("@/lib/server/admin");
    rzp.fxRate = null;
    await assert.rejects(checkout(5), /Pricing is unavailable/);
    await adminDb().doc("billing_fx/USD-INR").set({
      rate: 88, day: "2000-01-01", fetchedAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    const { startSubscription } = await import("@/lib/server/billing");
    const r = await startSubscription(caller(U.uid, U.email), "kamal", 5);
    assert.equal(r.quote.fxRate, 88);
    await adminDb().doc("billing_fx/USD-INR").set({
      rate: 88, day: "2000-01-01", fetchedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    });
    await assert.rejects(startSubscription(caller(U.uid, U.email), undefined, 6), /Pricing is unavailable/);
  });
});

async function liveWorkspaceWithLedger(uid = U.uid, email = U.email, ws = "kamal") {
  await seedUser(uid, email, { ws });
  const { initialLedger } = await import("@/lib/billing/credits");
  const { adminDb } = await import("@/lib/server/admin");
  await adminDb().doc(`users/${uid}`).update({ credits: initialLedger() });
}

describe("top-up confirm (Checkout's success handler)", () => {
  it("applies the pack at once, moves the key's limit, and nothing after it adds again", async () => {
    await liveWorkspaceWithLedger();
    const { startTopup, confirmTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    const pay = rzp.payOrder(order.orderId);
    const r = await confirmTopup(caller(U.uid, U.email), pay.id);
    assert.equal(r.outcome, "applied");
    assert.equal(r.ledger?.purchasedUsd, 10);
    assert.equal((await ops()).filter((o) => o.op === "sync_limit").length, 1);
    // Not flagged as a missed webhook: this is the normal path.
    assert.equal((await list("billing_events")).filter((e) => e.id === `reconcile:${pay.id}`).length, 0);

    assert.equal((await confirmTopup(caller(U.uid, U.email), pay.id)).outcome, "duplicate");
    await webhook("payment.captured", { payment: rzp.payments.get(pay.id)! });
    await worker("reconcile");
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 10);
  });

  it("an authorized payment is captured, then applied", async () => {
    await liveWorkspaceWithLedger();
    const { startTopup, confirmTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    const pay = rzp.payOrder(order.orderId, "authorized");
    assert.equal((await confirmTopup(caller(U.uid, U.email), pay.id)).outcome, "applied");
    assert.equal(rzp.payments.get(pay.id)?.status, "captured");
  });

  it("someone else's payment is refused and credits nobody", async () => {
    await liveWorkspaceWithLedger();
    await liveWorkspaceWithLedger("u2", "b@example.com", "bina");
    const { startTopup, confirmTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    const pay = rzp.payOrder(order.orderId);
    await assert.rejects(confirmTopup(caller("u2", "b@example.com"), pay.id), /isn't a credit pack on your account/);
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 0);
    assert.equal((await read("users/u2"))?.credits.purchasedUsd, 0);
  });

  it("an order not paid yet is pending", async () => {
    await liveWorkspaceWithLedger();
    const { startTopup, confirmTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    const pay = rzp.addPayment({ amount: order.amountMinor, currency: order.currency, order_id: order.orderId, status: "created" });
    assert.equal((await confirmTopup(caller(U.uid, U.email), pay.id)).outcome, "pending");
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 0);
  });
});

describe("top-ups", () => {
  it("a pack is charged in rupees at the day's rate + GST; the credit is the face price", async () => {
    await seedUser(U.uid, U.email, { ws: "kamal" });
    const { initialLedger } = await import("@/lib/billing/credits");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ credits: initialLedger() });
    const { startTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    assert.equal(order.currency, "INR");
    assert.equal(order.amountMinor, 900_00 + 162_00);
    assert.equal(rzp.orders.get(order.orderId)?.amount, 1_062_00);
    assert.equal(order.creditUsd, 10);
    const pay = rzp.payOrder(order.orderId);
    await webhook("payment.captured", { payment: rzp.payments.get(pay.id)! });
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 10);
  });
});
