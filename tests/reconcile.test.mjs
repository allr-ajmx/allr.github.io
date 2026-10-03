/** The safety net's rules: a missed event is applied once, never twice, never guessed. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditToRevoke, grantsMonth, isOrderPayment, missedSubscriptionEvent, nextPaidCount } from "../src/lib/billing/reconcile.ts";

const end = (iso) => Date.parse(iso) / 1000;

describe("missedSubscriptionEvent", () => {
  it("nothing to do when our record matches Razorpay", () => {
    assert.equal(missedSubscriptionEvent(
      { providerStatus: "active", paidCount: 2, currentPeriodEnd: "2026-11-02T00:00:00.000Z" },
      { status: "active", paid_count: 2, current_end: end("2026-11-02T00:00:00Z") }), null);
  });
  it("a charge we never heard about is reported as charged", () => {
    assert.equal(missedSubscriptionEvent({ providerStatus: "active", paidCount: 1 }, { status: "active", paid_count: 2 }),
      "subscription.charged");
  });
  it("first payment missed: pending checkout → active", () => {
    assert.equal(missedSubscriptionEvent({ providerStatus: "created", paidCount: 0 }, { status: "active", paid_count: 1 }),
      "subscription.charged");
    assert.equal(missedSubscriptionEvent({ providerStatus: "created", paidCount: null }, { status: "active", paid_count: 1 }),
      "subscription.activated");
  });
  it("status changes map to their event", () => {
    assert.equal(missedSubscriptionEvent({ providerStatus: "active", paidCount: 3 }, { status: "halted", paid_count: 3 }), "subscription.halted");
    assert.equal(missedSubscriptionEvent({ providerStatus: "active", paidCount: 3 }, { status: "cancelled", paid_count: 3 }), "subscription.cancelled");
  });
  it("an older record without a paid count is never guessed at", () => {
    assert.equal(missedSubscriptionEvent({ providerStatus: "active", paidCount: undefined }, { status: "active", paid_count: 4 }), null);
  });
});

describe("grantsMonth", () => {
  it("once per paid_count, whichever path sees it first", () => {
    assert.equal(grantsMonth("subscription.charged", 1, 2), true);
    assert.equal(grantsMonth("subscription.charged", 2, 2), false);
    assert.equal(grantsMonth("subscription.activated", 1, 2), false);
  });
  it("falls back to the event when counts are missing", () => {
    assert.equal(grantsMonth("subscription.charged", undefined, 2), true);
    assert.equal(grantsMonth("subscription.charged", 1, undefined), true);
  });
});

describe("creditToRevoke", () => {
  it("full refund takes back the pack; partial takes back its share", () => {
    assert.equal(creditToRevoke(9.2, 89900, 89900), 9.2);
    assert.equal(creditToRevoke(9.2, 89900, 44950), 4.6);
    assert.equal(creditToRevoke(9.2, 89900, 999999), 9.2);
    assert.equal(creditToRevoke(9.2, 0, 100), 0);
  });
});

describe("isOrderPayment", () => {
  it("one-off order payments only", () => {
    assert.equal(isOrderPayment({ order_id: "order_1" }), true);
    assert.equal(isOrderPayment({ order_id: "order_1", invoice_id: "inv_1" }), false);
    assert.equal(isOrderPayment({}), false);
  });
});

describe("the first payment: activated, then charged, same count (regression)", () => {
  it("activation doesn't advance the count, so the charge right after still grants", () => {
    let stored = 0; // a new subscription starts at 0
    const afterActivated = nextPaidCount(grantsMonth("subscription.activated", stored, 1), stored, 1);
    assert.equal(afterActivated, 0);
    assert.equal(grantsMonth("subscription.charged", afterActivated, 1), true);
    stored = nextPaidCount(true, afterActivated, 1);
    assert.equal(stored, 1);
    // the reconciler (or a redelivery) seeing the same charge does nothing
    assert.equal(grantsMonth("subscription.charged", stored, 1), false);
    assert.equal(missedSubscriptionEvent({ providerStatus: "active", paidCount: 1 }, { status: "active", paid_count: 1 }), null);
  });
  it("a missed renewal is found and granted exactly once", () => {
    assert.equal(missedSubscriptionEvent({ providerStatus: "active", paidCount: 1 }, { status: "active", paid_count: 2 }), "subscription.charged");
    assert.equal(nextPaidCount(true, 1, 2), 2);
  });
});
