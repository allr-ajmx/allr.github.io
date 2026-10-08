/**
 * Subscriptions end to end: checkout, webhooks (any order, redelivered),
 * renewals, cancellation, and the leftovers of test mode. Characterises
 * today's behaviour so the billing-core rebuild can prove it changed nothing.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { caller, freshRazorpay, list, ops, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => { await resetDb(); rzp.subscriptions.clear(); rzp.payments.clear(); rzp.refunds.clear(); });

async function subscribe(uid: string, email: string, username = "kamal") {
  const { startSubscription } = await import("@/lib/server/billing");
  return startSubscription(caller(uid, email), username);
}

describe("signing up", () => {
  it("checkout creates one pending subscription and reserves the name", async () => {
    await seedUser("u1", "k@example.com");
    const r = await subscribe("u1", "k@example.com");
    const u = await read("users/u1");
    assert.equal(u?.billing.status, "pending");
    assert.equal(u?.billing.subscriptionId, r.subscriptionId);
    assert.equal(u?.pending_workspace_username, "kamal");
    assert.equal((await read("workspace_usernames/kamal"))?.uid, "u1");
  });

  it("an abandoned checkout is reused, never duplicated", async () => {
    await seedUser("u1", "k@example.com");
    const a = await subscribe("u1", "k@example.com");
    const b = await subscribe("u1", "k@example.com");
    assert.equal(a.subscriptionId, b.subscriptionId);
    assert.equal(rzp.subscriptions.size, 1);
  });

  it("the paying webhook activates billing and queues exactly one build", async () => {
    await seedUser("u1", "k@example.com");
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    const sub = rzp.subscriptions.get(subscriptionId)!;
    assert.equal((await webhook("subscription.activated", { subscription: sub })).status, 200);
    assert.equal((await webhook("subscription.charged", { subscription: sub })).status, 200);
    const u = await read("users/u1");
    assert.equal(u?.billing.status, "active");
    const q = await read("provision_queue/u1");
    assert.equal(q?.status, "queued");
    assert.equal(q?.username, "kamal");
  });

  it("a redelivered webhook is a no-op", async () => {
    await seedUser("u1", "k@example.com");
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    const sub = rzp.subscriptions.get(subscriptionId)!;
    await webhook("subscription.charged", { subscription: sub }, "evt_same");
    const before = await read("users/u1");
    const again = await webhook("subscription.charged", { subscription: sub }, "evt_same");
    assert.ok(["duplicate", "unchanged"].includes(again.body?.outcome));
    assert.deepEqual((await read("users/u1"))?.billing.paidCount, before?.billing.paidCount);
  });

  it("a webhook carrying an old state can't roll the account back (Razorpay is asked)", async () => {
    await seedUser("u1", "k@example.com");
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    const stale = { ...rzp.subscriptions.get(subscriptionId)! }; // "created", count 0
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    await webhook("subscription.pending", { subscription: stale }); // late, out of order
    assert.equal((await read("users/u1"))?.billing.status, "active");
  });

  it("a test-mode leftover checkout doesn't block subscribing for real", async () => {
    await seedUser("u1", "k@example.com", {
      fields: { billing: { status: "pending", subscriptionId: "sub_from_test_mode", planCurrency: "INR", customerId: "c", currentPeriodEnd: null, providerStatus: "created", statusSince: null } },
    });
    const r = await subscribe("u1", "k@example.com");
    assert.notEqual(r.subscriptionId, "sub_from_test_mode");
    assert.equal((await read("users/u1"))?.billing.subscriptionId, r.subscriptionId);
  });

  it("an abandoned checkout that was in fact paid is applied, not reopened", async () => {
    await seedUser("u1", "k@example.com");
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId); // paid, but no webhook arrived
    await assert.rejects(subscribe("u1", "k@example.com"), /already|on its way/i);
    assert.equal((await read("users/u1"))?.billing.status, "active");
    assert.equal((await read("provision_queue/u1"))?.status, "queued");
  });
});

describe("renewals", () => {
  async function liveCustomer() {
    const { initialLedger } = await import("@/lib/billing/credits");
    await seedUser("u1", "k@example.com", { ws: "kamal" });
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    // the build finished; ledger opened with a little spend on it
    const l = { ...initialLedger(), usageUsd: 7, usageSyncedAt: new Date().toISOString() };
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ credits: l });
    return subscriptionId;
  }

  it("each renewal is recorded once, whichever path sees it, and adds no AI credit", async () => {
    const subId = await liveCustomer();
    rzp.charge(subId);
    const sub = rzp.subscriptions.get(subId)!;
    await webhook("subscription.charged", { subscription: sub });
    await webhook("subscription.charged", { subscription: sub }); // a second delivery, new event id
    await worker("reconcile"); // and the safety net sees the same charge
    const u = await read("users/u1");
    assert.equal(u?.billing.paidCount, 2);
    assert.equal(u?.credits.purchasedUsd, 0);
  });

  it("the activation arriving before the charge doesn't swallow the renewal (regression)", async () => {
    const subId = await liveCustomer();
    rzp.charge(subId);
    const sub = rzp.subscriptions.get(subId)!;
    await webhook("subscription.activated", { subscription: sub });
    await webhook("subscription.charged", { subscription: sub });
    assert.equal((await read("users/u1"))?.billing.paidCount, 2);
  });

  it("a renewal no webhook reported is found by the reconciler and flagged", async () => {
    const subId = await liveCustomer();
    rzp.charge(subId); // silent renewal
    await worker("reconcile");
    assert.equal((await read("users/u1"))?.billing.paidCount, 2);
    const flags = (await import("./harness.ts")).list;
    const events = await flags("billing_events");
    assert.ok(events.some((e) => (e as { flag?: boolean; reason?: string }).flag && /webhook missed/.test(String((e as { reason?: string }).reason))));
  });
});

describe("when webhooks don't arrive (prod, October 2026)", () => {
  it("checkout applies a paid subscription itself, without a webhook and without a flag", async () => {
    await seedUser("u1", "k@example.com");
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    const { confirmCheckout } = await import("@/lib/server/billing");
    const summary = await confirmCheckout(caller("u1", "k@example.com"), subscriptionId);
    assert.equal(summary.billing?.status, "active");
    assert.equal((await read("provision_queue/u1"))?.status, "queued");
    const events = await list("billing_events");
    assert.ok(!events.some((e) => (e as { flag?: boolean }).flag));
  });

  it("checkout confirm refuses a subscription that isn't the caller's", async () => {
    await seedUser("u1", "k@example.com");
    await seedUser("u2", "m@example.com");
    const theirs = await subscribe("u2", "m@example.com", "mira");
    const { confirmCheckout } = await import("@/lib/server/billing");
    await assert.rejects(confirmCheckout(caller("u1", "k@example.com"), theirs.subscriptionId), /isn't on your account/);
    await assert.rejects(confirmCheckout(caller("u1", "k@example.com"), undefined), /isn't on your account/);
  });

  it("the reconciler names the cause once when no webhook is on record", async () => {
    await seedUser("u1", "k@example.com");
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId); // paid; Razorpay's webhook never reaches us
    const r = await worker("reconcile");
    assert.equal(r.body.subscriptions.applied, 1);
    assert.equal(r.body.webhookSilentSince, "never");
    const runRow = (await list("billing_events")).find((e) => e.id.startsWith("reconcile-run:")) as Record<string, unknown>;
    assert.equal(runRow.flag, true);
    assert.equal(runRow.outcome, "webhook-silent");
    assert.match(String(runRow.reason), /^No verified Razorpay webhook is on record/);
  });

  it("a single miss while webhooks are flowing is not blamed on the webhook path", async () => {
    await seedUser("u1", "k@example.com", { ws: "kamal" });
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    assert.ok((await read("billing_health/webhook"))?.lastVerifiedAt);
    rzp.charge(subscriptionId); // this renewal's webhook alone went missing
    const r = await worker("reconcile");
    assert.equal(r.body.subscriptions.applied, 1);
    assert.equal(r.body.webhookSilentSince, undefined);
  });

  it("a webhook with the wrong secret is refused and flagged once an hour", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");
    const send = (headers: Record<string, string>) =>
      POST(new Request("https://www.allr.work/api/billing/webhook/", { method: "POST", headers, body: "{}" }));
    assert.equal((await send({ "x-razorpay-signature": "deadbeef" })).status, 401);
    assert.equal((await send({ "x-razorpay-signature": "cafebabe" })).status, 401);
    const rows = (await list("billing_events")).filter((e) => e.id.startsWith("webhook-rejected:"));
    assert.equal(rows.length, 1);
    assert.equal((rows[0] as { flag?: boolean }).flag, true);
    assert.match(String((rows[0] as { reason?: string }).reason), /signature mismatch/);
  });

  it("an unsigned stray POST is refused without a flag", async () => {
    const { POST } = await import("@/app/api/billing/webhook/route");
    const res = await POST(new Request("https://www.allr.work/api/billing/webhook/", { method: "POST", body: "{}" }));
    assert.equal(res.status, 401);
    assert.equal((await list("billing_events")).length, 0);
  });
});

describe("cancelling", () => {
  it("cancelling keeps it running until the period ends and says so", async () => {
    await seedUser("u1", "k@example.com", { ws: "kamal" });
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    const { cancelSubscription } = await import("@/lib/server/billing");
    await cancelSubscription(caller("u1", "k@example.com"));
    const u = await read("users/u1");
    assert.equal(u?.billing.status, "active");
    assert.equal(u?.billing.cancelAtPeriodEnd, true);
    // a later event for the same subscription keeps the cancellation
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    assert.equal((await read("users/u1"))?.billing.cancelAtPeriodEnd, true);
    await assert.rejects(cancelSubscription(caller("u1", "k@example.com")), /already cancelled/i);
  });
});

describe("the reconciler and test-mode leftovers", () => {
  it("marks a subscription Razorpay doesn't know as ended, once", async () => {
    await seedUser("u1", "k@example.com", {
      ws: "kamal",
      fields: { billing: { status: "active", subscriptionId: "sub_test_mode", planCurrency: "INR", customerId: "c", currentPeriodEnd: null, providerStatus: "active", statusSince: null } },
    });
    const r = await worker("reconcile");
    assert.equal(r.status, 200);
    assert.equal(r.body.errors.length, 0);
    assert.equal((await read("users/u1"))?.billing.status, "ended");
    const again = await worker("reconcile");
    assert.equal(again.body.subscriptions.checked, 0);
  });

  it("an outage is an error to retry, never a reason to end anything", async () => {
    await seedUser("u1", "k@example.com", { ws: "kamal" });
    const { subscriptionId } = await subscribe("u1", "k@example.com");
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    rzp.outage = { match: /^\/subscriptions\//, remaining: 5 };
    const r = await worker("reconcile");
    rzp.outage = null;
    assert.equal(r.body.errors.length, 1);
    assert.equal((await read("users/u1"))?.billing.status, "active");
  });
});

void ops;
