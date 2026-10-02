/**
 * The code that turns workspaces off and deletes customer data. Every branch
 * boundary is a test, because every miss here is either lost revenue or a
 * destroyed workspace.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REMOVE_AFTER_DAYS,
  decide,
  enforcementAfterSuspend,
} from "../src/lib/billing/lifecycle.ts";
import { GRACE_DAYS } from "../src/lib/billing/model.ts";

const T0 = new Date("2026-10-01T12:00:00Z");
const daysAgo = (n) => new Date(T0.getTime() - n * 86_400_000).toISOString();
const daysAhead = (n) => new Date(T0.getTime() + n * 86_400_000).toISOString();

const base = {
  hasWorkspace: true,
  billing: null,
  trialEndsAt: null,
  enforcement: null,
};
const billing = (status, statusSince, currentPeriodEnd = null) => ({
  status,
  statusSince,
  currentPeriodEnd,
});
const suspendedSince = (n, reason = "payment") => ({
  status: "suspended",
  reason,
  suspendedAt: daysAgo(n),
  removeAfter: reason === "payment" ? daysAgo(n - REMOVE_AFTER_DAYS) : null,
});

describe("decide", () => {
  it("no workspace: nothing, whatever billing says", () => {
    assert.equal(decide({ ...base, hasWorkspace: false, billing: billing("pastDue", daysAgo(99)) }, T0).action, "none");
  });

  it("active and healthy: nothing", () => {
    assert.equal(decide({ ...base, billing: billing("active", daysAgo(10)) }, T0).action, "none");
  });

  it("payment recovers: resume only a billing suspension", () => {
    assert.equal(
      decide({ ...base, billing: billing("active", daysAgo(0)), enforcement: suspendedSince(3) }, T0).action,
      "resume",
    );
  });

  it("an admin's manual suspension is invisible to the enforcer", () => {
    // Admin suspensions never write `enforcement`, so active billing + no
    // enforcement must not resume, and unpaid + no enforcement must follow
    // the ordinary grace path rather than the removal clock.
    assert.equal(decide({ ...base, billing: billing("active", daysAgo(1)) }, T0).action, "none");
    assert.equal(decide({ ...base, billing: billing("pastDue", daysAgo(1)) }, T0).action, "none");
  });

  it("pastDue: suspend only after the full grace window", () => {
    assert.equal(decide({ ...base, billing: billing("pastDue", daysAgo(GRACE_DAYS - 0.5)) }, T0).action, "none");
    assert.equal(decide({ ...base, billing: billing("pastDue", daysAgo(GRACE_DAYS)) }, T0).action, "suspend");
  });

  it("cancelled: runs to the paid period's end, then suspends", () => {
    assert.equal(decide({ ...base, billing: billing("ended", daysAgo(1), daysAhead(5)) }, T0).action, "none");
    assert.equal(decide({ ...base, billing: billing("ended", daysAgo(10), daysAgo(1)) }, T0).action, "suspend");
  });

  it("the removal clock: only after suspension + 7 days, only while unpaid", () => {
    assert.equal(
      decide({ ...base, billing: billing("pastDue", daysAgo(20)), enforcement: suspendedSince(REMOVE_AFTER_DAYS - 1) }, T0).action,
      "none",
    );
    assert.equal(
      decide({ ...base, billing: billing("pastDue", daysAgo(20)), enforcement: suspendedSince(REMOVE_AFTER_DAYS) }, T0).action,
      "remove",
    );
    assert.equal(
      decide({ ...base, billing: billing("ended", daysAgo(20), daysAgo(15)), enforcement: suspendedSince(8) }, T0).action,
      "remove",
    );
  });

  it("a trial that never paid: suspend after grace, NEVER remove", () => {
    assert.equal(decide({ ...base, trialEndsAt: daysAgo(1) }, T0).action, "none");
    assert.equal(decide({ ...base, trialEndsAt: daysAgo(GRACE_DAYS) }, T0).action, "suspend");
    // Even suspended for a month, a trial suspension never hits the removal clock.
    assert.equal(
      decide({ ...base, trialEndsAt: daysAgo(40), enforcement: suspendedSince(30, "trial") }, T0).action,
      "none",
    );
  });

  it("a trial suspension resumes the moment they subscribe", () => {
    assert.equal(
      decide({ ...base, billing: billing("active", daysAgo(0)), trialEndsAt: daysAgo(10), enforcement: suspendedSince(5, "trial") }, T0).action,
      "resume",
    );
  });
});

describe("enforcementAfterSuspend", () => {
  it("payment suspensions get the 7-day removal deadline; trial ones never do", () => {
    assert.equal(enforcementAfterSuspend("payment", T0).removeAfter, daysAhead(REMOVE_AFTER_DAYS));
    assert.equal(enforcementAfterSuspend("trial", T0).removeAfter, null);
  });
});
