/**
 * Webhook triage: every unmatched event that involves money or a person must
 * be recorded for an admin; plain noise must not flood the feed.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { triageSubscriptionEvent, triageTopup } from "../src/lib/billing/triage.ts";

describe("subscription events", () => {
  it("acts on a subscription event that names its account", () => {
    assert.deepEqual(triageSubscriptionEvent("subscription.charged", { id: "sub_1", notes: { uid: "u1" } }), { act: true });
  });
  it("records a subscription with no uid note", () => {
    const t = triageSubscriptionEvent("subscription.activated", { id: "sub_1", notes: {} });
    assert.equal(t.act, false);
    assert.equal(t.record, true);
    assert.match(t.reason, /no uid/);
  });
  it("records a blank uid and a missing notes object alike", () => {
    assert.equal(triageSubscriptionEvent("subscription.charged", { id: "s", notes: { uid: "  " } }).record, true);
    assert.equal(triageSubscriptionEvent("subscription.charged", { id: "s", notes: null }).record, true);
  });
  it("records a subscription event with no entity", () => {
    assert.equal(triageSubscriptionEvent("subscription.halted", undefined).record, true);
  });
  it("does not record events we don't handle", () => {
    const t = triageSubscriptionEvent("invoice.paid", undefined);
    assert.equal(t.act, false);
    assert.equal(t.record, false);
  });
});

describe("top-up payments", () => {
  it("acts on a well-formed top-up", () => {
    assert.deepEqual(triageTopup({ notes: { kind: "topup", uid: "u1", credit_usd: "10" } }), { act: true });
  });
  it("ignores, quietly, payments that aren't top-ups (subscription charges)", () => {
    assert.equal(triageTopup({ notes: {} }).record, false);
    assert.equal(triageTopup({}).record, false);
  });
  it("records a top-up that can't be credited", () => {
    assert.equal(triageTopup({ notes: { kind: "topup", credit_usd: "10" } }).record, true);
    assert.equal(triageTopup({ notes: { kind: "topup", uid: "u1", credit_usd: "-5" } }).record, true);
    assert.equal(triageTopup({ notes: { kind: "topup", uid: "u1" } }).record, true);
  });
});
