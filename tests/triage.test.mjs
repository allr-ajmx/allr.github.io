/**
 * Webhook triage: every unmatched event that involves money or a person must
 * be recorded for an admin; plain noise must not flood the feed.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { triageTopup } from "../src/lib/billing/triage.ts";


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
