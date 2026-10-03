/**
 * One answer to "where is my workspace?" — every page renders from it, so
 * every transition (pay → build → live → cancel/fail → pause) is pinned here.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { workspaceStatus } from "../src/lib/account/workspace-status.ts";

const NOW = new Date("2026-10-02T12:00:00Z");
const bare = {
  workspace_username: null, workspace_email: null, workspace_address: null,
  pendingWorkspaceUsername: null, billing: null, enforcement: null, trial: null, promo: null,
};
const promo = (endsAt) => ({ code: "LAUNCH", redeemedAt: "2026-10-01T00:00:00Z", endsAt, creditUsd: 5 });
const withWs = {
  ...bare, workspace_username: "kamal", workspace_email: "k@x.co", workspace_address: "https://kamal.allr.work",
};
const bill = (status, currentPeriodEnd = "2026-11-02T00:00:00.000Z", extra = {}) => ({
  ...extra, status, currentPeriodEnd, planCurrency: "INR", subscriptionId: "sub", customerId: "c", providerStatus: status, statusSince: null, updatedAt: "",
});
const kind = (p, q = null) => workspaceStatus(p, q, NOW).kind;

describe("before the workspace exists", () => {
  it("nothing paid → none (an open, unpaid checkout included)", () => {
    assert.equal(kind(bare), "none");
    assert.equal(kind({ ...bare, billing: bill("pending") }), "none");
    assert.equal(kind({ ...bare, billing: bill("ended") }), "none");
  });
  it("paid → building, with the reserved name", () => {
    const s = workspaceStatus({ ...bare, pendingWorkspaceUsername: "kamal", billing: bill("active") }, { status: "queued" }, NOW);
    assert.deepEqual(s, { kind: "building", username: "kamal", delayed: false });
  });
  it("a failed build reads as delayed, not as live or as nothing", () => {
    const s = workspaceStatus({ ...bare, billing: bill("active") }, { status: "failed" }, NOW);
    assert.equal(s.kind, "building");
    assert.equal(s.delayed, true);
  });
  it("two of three workspace fields is not a workspace", () => {
    assert.equal(kind({ ...withWs, workspace_address: null, billing: bill("active") }), "building");
  });
});

describe("once it exists", () => {
  it("paid → live, paid, with the renewal date", () => {
    const s = workspaceStatus({ ...withWs, billing: bill("active") }, null, NOW);
    assert.deepEqual([s.kind, s.paid, s.renewsAt, s.promoEndsAt], ["live", true, "2026-11-02T00:00:00.000Z", null]);
  });
  it("no subscription at all is live but NOT paid (comp, manual era, free week)", () => {
    for (const billing of [null, bill("pending")]) {
      const s = workspaceStatus({ ...withWs, billing }, null, NOW);
      assert.deepEqual([s.kind, s.paid, s.renewsAt], ["live", false, null]);
    }
  });
  it("cancelled but still in the paid period → ending, and no new subscription offered yet", () => {
    const s = workspaceStatus({ ...withWs, billing: bill("active", undefined, { cancelAtPeriodEnd: true }) }, null, NOW);
    assert.deepEqual([s.kind, s.over, s.canResubscribe, s.endsAt], ["ending", false, false, "2026-11-02T00:00:00.000Z"]);
  });
  it("ended with the period already past → ending, over, resubscribe allowed", () => {
    const s = workspaceStatus({ ...withWs, billing: bill("ended", "2026-09-30T00:00:00.000Z") }, null, NOW);
    assert.deepEqual([s.kind, s.over, s.canResubscribe], ["ending", true, true]);
  });
  it("a failed charge → paymentDue", () => assert.equal(kind({ ...withWs, billing: bill("pastDue") }), "paymentDue"));
  it("ended by Razorpay → ending, with the end date", () => {
    const s = workspaceStatus({ ...withWs, billing: bill("ended") }, null, NOW);
    assert.deepEqual([s.kind, s.endsAt, s.over], ["ending", "2026-11-02T00:00:00.000Z", false]);
  });
  it("paused outranks every billing state, and says why in the person's terms", () => {
    // Stored removeAfter is from the old 7-day window: the shown date must follow suspendedAt + 14.
    const enforcement = { status: "suspended", reason: "payment", suspendedAt: "2026-10-02T00:00:00.000Z", removeAfter: "2026-10-09T00:00:00.000Z" };
    const cases = [["pastDue", "payment", false], ["ended", "cancelled", false], ["active", "payment", true]];
    for (const [st, cause, resuming] of cases) {
      const s = workspaceStatus({ ...withWs, billing: bill(st), enforcement }, null, NOW);
      assert.deepEqual([s.kind, s.cause, s.resuming, s.removeAfter], ["paused", cause, resuming, "2026-10-16T00:00:00.000Z"], st);
    }
    const trial = workspaceStatus({ ...withWs, enforcement: { ...enforcement, reason: "trial", removeAfter: null } }, null, NOW);
    assert.deepEqual([trial.cause, trial.resuming, trial.removeAfter], ["trial", false, null]);
  });
  it("manual-era workspace: running week is live, finished week is trialEnded", () => {
    const trial = (endsAt) => ({ startedAt: "2026-09-20T00:00:00Z", endsAt, creditUsd: 5, creditUsedUsd: 0 });
    assert.equal(kind({ ...withWs, trial: trial("2026-10-05T00:00:00Z") }), "live");
    assert.equal(kind({ ...withWs, trial: trial("2026-09-27T00:00:00Z") }), "trialEnded");
    assert.equal(kind({ ...withWs }), "live");
  });
  it("a paying customer never reads as trialEnded, whatever the old trial says", () => {
    const trial = { startedAt: "", endsAt: "2026-01-01T00:00:00Z", creditUsd: 5, creditUsedUsd: 0 };
    assert.equal(kind({ ...withWs, trial, billing: bill("active") }), "live");
  });
});

describe("a promotional month", () => {
  it("redeemed, no workspace yet → building (owed one, like a payment)", () => {
    const s = workspaceStatus({ ...bare, pendingWorkspaceUsername: "kamal", promo: promo("2026-11-01T00:00:00Z") }, { status: "queued" }, NOW);
    assert.deepEqual(s, { kind: "building", username: "kamal", delayed: false });
  });
  it("running → live, unpaid, with the end date", () => {
    const s = workspaceStatus({ ...withWs, promo: promo("2026-11-01T00:00:00Z"), trial: { startedAt: "", endsAt: "2026-11-01T00:00:00Z", creditUsd: 5, creditUsedUsd: 0 } }, null, NOW);
    assert.deepEqual([s.kind, s.paid, s.promoEndsAt], ["live", false, "2026-11-01T00:00:00Z"]);
  });
  it("over and unpaid → trialEnded, marked as the promo", () => {
    const s = workspaceStatus({ ...withWs, promo: promo("2026-10-01T00:00:00Z") }, null, NOW);
    assert.deepEqual([s.kind, s.promo], ["trialEnded", true]);
  });
  it("subscribing during or after it → plainly paid", () => {
    const s = workspaceStatus({ ...withWs, promo: promo("2026-11-01T00:00:00Z"), billing: bill("active") }, null, NOW);
    assert.deepEqual([s.kind, s.paid, s.promoEndsAt], ["live", true, null]);
  });
  it("an expired promo with no workspace owes nothing", () => {
    assert.equal(kind({ ...bare, promo: promo("2026-10-01T00:00:00Z") }), "none");
  });
});
