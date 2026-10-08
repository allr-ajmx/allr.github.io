/** One-off payment rules (subscription rules are tested in core.test.mjs). */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WEBHOOK_SILENT_AFTER_MS,
  appliedCount,
  creditToRevoke,
  describeRun,
  isOrderPayment,
  webhookSilence,
} from "../src/lib/billing/reconcile.ts";

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


const run = (over = {}) => ({
  topups: {}, refunds: {}, subscriptions: { checked: 3, applied: 0, quiet: 0 }, errors: [], ...over,
});

describe("webhookSilence", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  it("a recent verified webhook means the path works", () => {
    assert.equal(webhookSilence(new Date(now.getTime() - 5 * 60_000).toISOString(), now), null);
  });
  it("none on record, or none for over the threshold, means it is down", () => {
    assert.equal(webhookSilence(null, now), "never");
    assert.equal(webhookSilence("garbage", now), "never");
    const old = new Date(now.getTime() - WEBHOOK_SILENT_AFTER_MS - 1).toISOString();
    assert.equal(webhookSilence(old, now), old);
  });
});

describe("describeRun", () => {
  it("counts what it applied", () => {
    assert.equal(appliedCount(run({ topups: { applied: 1, refunded: 1 }, subscriptions: { checked: 2, applied: 2, quiet: 0 } })), 4);
    assert.equal(describeRun(run({ subscriptions: { checked: 2, applied: 2, quiet: 0 } })),
      "Billing check: 2 missed subscription update(s) applied.");
  });
  it("leads with the cause when webhooks have gone quiet (prod, October 2026)", () => {
    const text = describeRun(run({ subscriptions: { checked: 1, applied: 1, quiet: 0 }, webhookSilentSince: "2026-10-02T13:04:00.000Z" }));
    assert.match(text, /^No Razorpay webhook has reached the site since 2026-10-02T13:04:00.000Z/);
    assert.match(text, /\/api\/billing\/webhook\//);
    assert.match(text, /1 missed subscription update\(s\) applied\.$/);
    assert.match(describeRun(run({ webhookSilentSince: "never" })), /^No verified Razorpay webhook is on record/);
  });
  it("lists errors after", () => {
    assert.equal(describeRun(run({ errors: ["subscription s: Razorpay 429: Too many requests"] })),
      "Billing check: 1 problem(s) — subscription s: Razorpay 429: Too many requests");
  });
});
