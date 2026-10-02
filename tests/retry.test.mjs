/**
 * Automatic retry for provisioning and ops: three attempts with backoff, then
 * a human. Backoff must actually delay; the last attempt must actually stop.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BACKOFF_MS, MAX_ATTEMPTS, isDue, nextAttempt, shouldEnqueue } from "../src/lib/admin/retry.ts";

const NOW = Date.parse("2026-10-02T12:00:00Z");

describe("retry policy", () => {
  it("the first failure requeues after 5 minutes", () => {
    const r = nextAttempt(0, NOW);
    assert.equal(r.status, "queued");
    assert.equal(r.attempts, 1);
    assert.equal(r.retryAt.getTime(), NOW + 5 * 60_000);
  });
  it("the second failure requeues after 15 minutes", () => {
    const r = nextAttempt(1, NOW);
    assert.equal(r.status, "queued");
    assert.equal(r.retryAt.getTime(), NOW + 15 * 60_000);
  });
  it("the third failure stops and waits for a human", () => {
    assert.deepEqual(nextAttempt(2, NOW), { attempts: 3, status: "failed", retryAt: null });
  });
  it("never retries past the cap, whatever count is stored", () => {
    assert.equal(nextAttempt(7, NOW).status, "failed");
    assert.equal(MAX_ATTEMPTS, 3);
    assert.equal(BACKOFF_MS.length, MAX_ATTEMPTS);
  });
  it("a garbage negative count is treated as zero", () => {
    assert.equal(nextAttempt(-4, NOW).attempts, 1);
  });
});

describe("claimability", () => {
  it("no backoff → due", () => {
    assert.equal(isDue(null, NOW), true);
    assert.equal(isDue(undefined, NOW), true);
  });
  it("backoff in the future → not due; elapsed → due", () => {
    assert.equal(isDue(new Date(NOW + 1), NOW), false);
    assert.equal(isDue(new Date(NOW), NOW), true);
  });
});

describe("a payment (re)starting a build", () => {
  it("never doubles a build in flight, nor overrides a failed one awaiting retry", () => {
    for (const st of ["queued", "claimed", "failed"]) assert.equal(shouldEnqueue(st), false, st);
  });
  it("starts fresh when the old entry's workspace is history (regression: re-subscribe after removal)", () => {
    for (const st of [undefined, "provisioned", "released"]) assert.equal(shouldEnqueue(st), true, String(st));
  });
});
