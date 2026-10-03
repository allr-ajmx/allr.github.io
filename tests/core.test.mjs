/**
 * The billing core: Razorpay's current state in, one decision out. Order and
 * redelivery can't matter because the input is a state, not an event.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decide, missing } from "../src/lib/billing/core.ts";

const NOW = new Date("2026-10-04T12:00:00Z");
const end = Date.parse("2026-11-04T00:00:00Z") / 1000;
const facts = { hasWorkspace: false, pendingUsername: "kamal", suspended: false };
const opts = { planCurrency: "INR", plan: "workspace_ai", now: NOW };
const sub = (x = {}) => ({ id: "sub_1", status: "active", customer_id: "cust_1", current_end: end, paid_count: 1, ...x });
const rec = (x = {}) => ({
  status: "active", providerStatus: "active", statusSince: "2026-10-01T00:00:00.000Z", planCurrency: "INR",
  subscriptionId: "sub_1", customerId: "cust_1", currentPeriodEnd: "2026-11-04T00:00:00.000Z",
  cancelAtPeriodEnd: false, paidCount: 1, plan: "workspace_ai", currentPeriodStart: "2026-10-04T00:00:00.000Z",
  upcoming: null, updatedAt: "", ...x,
});

describe("first payment", () => {
  it("checkout record (created, count 0) → pending, nothing granted or built", () => {
    const d = decide(null, sub({ status: "created", paid_count: 0, current_end: null }), facts, opts);
    assert.equal(d.billing.status, "pending");
    assert.equal(d.billing.paidCount, 0);
    assert.equal(d.effects.grantMonth || d.effects.queueBuild || d.effects.resume, false);
  });
  it("paid → active, the month granted once, the build queued, the allowance set by the plan", () => {
    const d = decide(rec({ status: "pending", providerStatus: "created", paidCount: 0 }), sub(), facts, opts);
    assert.equal(d.billing.status, "active");
    assert.equal(d.effects.grantMonth, true);
    assert.equal(d.effects.queueBuild, true);
    assert.equal(d.effects.setIncludedUsd, 20);
    assert.equal(d.billing.paidCount, 1);
  });
  it("the same state again (any event, any order) does nothing more", () => {
    const d = decide(rec(), sub(), { ...facts, hasWorkspace: true }, { ...opts, chargeHint: true });
    assert.equal(d.changed, false);
    assert.equal(d.effects.grantMonth || d.effects.queueBuild || d.effects.resume, false);
  });
});

describe("renewals", () => {
  it("each new paid_count grants once and moves the period", () => {
    const d = decide(rec(), sub({ paid_count: 2, current_end: end + 30 * 86400 }), { ...facts, hasWorkspace: true }, opts);
    assert.equal(d.effects.grantMonth, true);
    assert.equal(d.billing.paidCount, 2);
    assert.equal(d.billing.currentPeriodEnd, "2026-12-04T00:00:00.000Z");
  });
  it("an older record without a count: a charge hint grants, anything else sets the baseline", () => {
    const legacy = rec({ paidCount: null });
    assert.equal(decide(legacy, sub({ paid_count: 3 }), facts, { ...opts, chargeHint: true }).effects.grantMonth, true);
    const b = decide(legacy, sub({ paid_count: 3 }), facts, opts);
    assert.equal(b.effects.grantMonth, false);
    assert.equal(b.billing.paidCount, 3);
  });
});

describe("failures and recovery", () => {
  it("halted → pastDue; paid again while suspended → resume", () => {
    assert.equal(decide(rec(), sub({ status: "halted" }), facts, opts).billing.status, "pastDue");
    const d = decide(rec({ status: "pastDue" }), sub({ paid_count: 2 }), { ...facts, hasWorkspace: true, suspended: true }, opts);
    assert.equal(d.effects.grantMonth, true);
    assert.equal(d.effects.resume, true);
    assert.equal(d.effects.setIncludedUsd, null); // a renewal, not a new plan
  });
});

describe("cancellation and endings", () => {
  it("cancel intent is recorded and carried across later states of the same subscription", () => {
    const c = decide(rec(), sub(), facts, { ...opts, intent: { cancelAtPeriodEnd: true } });
    assert.equal(c.billing.cancelAtPeriodEnd, true);
    const later = decide({ ...c.billing, updatedAt: "" }, sub(), facts, opts);
    assert.equal(later.billing.cancelAtPeriodEnd, true);
  });
  it("a new subscription starts uncancelled", () => {
    const d = decide(rec({ status: "ended", cancelAtPeriodEnd: true }), sub({ id: "sub_2", status: "created", paid_count: 0 }), facts, opts);
    assert.equal(d.billing.cancelAtPeriodEnd, false);
    assert.equal(d.billing.paidCount, 0);
  });
  it("removal ends it now", () => {
    const d = decide(rec(), sub({ status: "cancelled" }), facts, { ...opts, intent: { endedNow: true } });
    assert.equal(d.billing.status, "ended");
    assert.equal(d.billing.currentPeriodEnd, NOW.toISOString());
  });
  it("a subscription Razorpay doesn't know is ended, never pending (test-mode leftover)", () => {
    const d = decide(rec(), missing("sub_1"), facts, opts);
    assert.equal(d.billing.status, "ended");
    assert.equal(d.billing.providerStatus, "missing");
    assert.equal(d.effects.queueBuild, false);
  });
});

describe("stale subscriptions", () => {
  it("an old subscription reporting late can't overwrite the active one", () => {
    assert.equal(decide(rec({ subscriptionId: "sub_new" }), sub({ id: "sub_old", status: "cancelled" }), facts, opts).kind, "stale");
  });
  it("but a new subscription replaces an ended one", () => {
    assert.equal(decide(rec({ status: "ended" }), sub({ id: "sub_2" }), facts, opts).kind, "apply");
  });
});

describe("plans", () => {
  it("a workspace-only subscription sets the AI allowance to 0 on its first charge", () => {
    const d = decide(rec({ status: "pending", providerStatus: "created", paidCount: 0, plan: "workspace" }), sub(), facts, { ...opts, plan: "workspace" });
    assert.equal(d.billing.plan, "workspace");
    assert.equal(d.effects.setIncludedUsd, 0);
  });
});

describe("changing plan (a second subscription that takes over at renewal)", () => {
  const ws = (x = {}) => rec({ plan: "workspace", ...x });
  const upcoming = (x = {}) => ({
    subscriptionId: "sub_2", plan: "workspace_ai", kind: "upgrade", status: "created",
    startsAt: "2026-11-04T00:00:00.000Z", chargeMinor: 800, creditUsd: 8, creditGranted: false, oldCancelled: false, ...x,
  });
  const live = { ...facts, hasWorkspace: true };

  it("checkout opened (created): nothing happens yet", () => {
    const d = decide(ws({ upcoming: upcoming() }), sub({ id: "sub_2", status: "created", paid_count: 0 }), live, opts);
    assert.equal(d.effects.grantCredit, null);
    assert.equal(d.effects.cancelCurrentAtPeriodEnd, null);
  });
  it("mandate set (authenticated): the prorated credit is granted until renewal, the current one told to end — once", () => {
    const d = decide(ws({ upcoming: upcoming() }), sub({ id: "sub_2", status: "authenticated", paid_count: 0 }), live, opts);
    assert.deepEqual(d.effects.grantCredit, { id: "upgrade-sub_2", usd: 8, expiresAt: "2026-11-04T00:00:00.000Z" });
    assert.equal(d.effects.cancelCurrentAtPeriodEnd, "sub_1");
    assert.equal(d.billing.upcoming.status, "authenticated");
    assert.equal(d.billing.upcoming.creditGranted, true);
    const again = decide({ ...ws(), ...d.billing, upcoming: { ...d.billing.upcoming, oldCancelled: true }, updatedAt: "" },
      sub({ id: "sub_2", status: "authenticated", paid_count: 0 }), live, opts);
    assert.equal(again.effects.grantCredit, null);
    assert.equal(again.effects.cancelCurrentAtPeriodEnd, null);
  });
  it("a downgrade grants nothing now", () => {
    const d = decide(rec({ upcoming: upcoming({ plan: "workspace", kind: "downgrade", chargeMinor: 0, creditUsd: 0 }) }),
      sub({ id: "sub_2", status: "authenticated", paid_count: 0 }), live, opts);
    assert.equal(d.effects.grantCredit, null);
    assert.equal(d.effects.cancelCurrentAtPeriodEnd, "sub_1");
  });
  it("at renewal it takes over: current, new plan's allowance, month granted", () => {
    const d = decide(ws({ upcoming: upcoming({ status: "authenticated", creditGranted: true, oldCancelled: true }) }),
      sub({ id: "sub_2", status: "active", paid_count: 1 }), live, opts);
    assert.equal(d.billing.subscriptionId, "sub_2");
    assert.equal(d.billing.plan, "workspace_ai");
    assert.equal(d.billing.upcoming, null);
    assert.equal(d.effects.grantMonth, true);
    assert.equal(d.effects.setIncludedUsd, 20);
  });
  it("the old subscription ending first doesn't lapse anything, and can't undo the takeover after", () => {
    const ended = decide(ws({ upcoming: upcoming({ status: "authenticated" }) }), sub({ status: "cancelled" }), live, opts);
    assert.equal(ended.billing.status, "ended");
    assert.equal(ended.billing.upcoming.status, "authenticated"); // still switching
    const took = decide({ ...ended.billing, updatedAt: "" }, sub({ id: "sub_2", status: "active", paid_count: 1 }), live, opts);
    const late = decide({ ...took.billing, updatedAt: "" }, sub({ status: "cancelled" }), live, opts);
    assert.equal(late.kind, "stale");
  });
  it("an abandoned or failed change is dropped and the current plan carries on", () => {
    const d = decide(ws({ upcoming: upcoming() }), sub({ id: "sub_2", status: "cancelled", paid_count: 0 }), live, opts);
    assert.equal(d.billing.upcoming, null);
    assert.equal(d.billing.subscriptionId, "sub_1");
  });
});
