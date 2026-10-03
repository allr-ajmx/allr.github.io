/**
 * Systems disagreeing must surface as issues, never as a confident state.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROSTER_STALE_MS, awaitingWorkspace, consistencyIssues } from "../src/lib/admin/consistency.ts";

const NOW = Date.parse("2026-10-02T12:00:00Z");
const base = { billingStatus: null, workspaceUsername: null, queueStatus: null, queueUsername: null, rosterSeenAt: null, queueWorkspaceOnVps: false };
const codes = (x) => consistencyIssues({ ...base, ...x }, NOW).map((i) => i.code);

describe("awaitingWorkspace — the one rule both the admin and the customer see", () => {
  it("only a paid subscription is owed a workspace", () => {
    assert.equal(awaitingWorkspace("active", false), true);
    assert.equal(awaitingWorkspace("pending", false), false);
    assert.equal(awaitingWorkspace("pastDue", false), false);
    assert.equal(awaitingWorkspace("ended", false), false);
    assert.equal(awaitingWorkspace(null, false), false);
    assert.equal(awaitingWorkspace("active", true), false);
  });
});

describe("consistency issues", () => {
  it("a clean account has none", () => {
    assert.deepEqual(codes({}), []);
    assert.deepEqual(codes({ billingStatus: "active", workspaceUsername: "k", queueStatus: "provisioned",
      rosterSeenAt: new Date(NOW - 60_000).toISOString() }), []);
  });
  it("an unpaid checkout is not an issue and not provisioning", () => {
    assert.deepEqual(codes({ billingStatus: "pending" }), []);
  });
  it("paid with nothing queued", () => {
    assert.deepEqual(codes({ billingStatus: "active" }), ["paid-not-queued"]);
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "queued" }), []);
  });
  it("VPS built it, it's still there, but the account never got linked", () => {
    assert.deepEqual(codes({ queueStatus: "provisioned", queueUsername: "k", queueWorkspaceOnVps: true }), ["built-not-stamped"]);
  });
  it("built then removed is history, not an alarm (regression: aruntest)", () => {
    assert.deepEqual(codes({ queueStatus: "provisioned", queueUsername: "k", queueWorkspaceOnVps: false }), []);
    assert.deepEqual(codes({ queueStatus: "released", queueUsername: "k" }), []);
  });
  it("paying again after a removal, with only an old entry, is paid-not-queued", () => {
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "released" }), ["paid-not-queued"]);
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "provisioned" }), ["paid-not-queued"]);
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "failed" }), []);
  });
  it("a linked workspace the VPS never or no longer reports", () => {
    assert.deepEqual(codes({ workspaceUsername: "k" }), ["not-on-vps"]);
    assert.deepEqual(codes({ workspaceUsername: "k", rosterSeenAt: new Date(NOW - ROSTER_STALE_MS - 1).toISOString() }), ["vps-silent"]);
  });
  it("a build still queued for someone who already has a workspace", () => {
    assert.deepEqual(codes({ workspaceUsername: "k", queueStatus: "queued", rosterSeenAt: new Date(NOW).toISOString() }),
      ["queued-with-workspace"]);
  });
});

describe("a workspace built minutes ago", () => {
  it("isn't flagged before the VPS's next roster push, but is after 15 minutes", () => {
    const fresh = { workspaceUsername: "k", queueStatus: "provisioned", queueUsername: "k" };
    assert.deepEqual(codes({ ...fresh, queueUpdatedAt: new Date(NOW - 2 * 60_000).toISOString() }), []);
    assert.deepEqual(codes({ ...fresh, queueUpdatedAt: new Date(NOW - 20 * 60_000).toISOString() }), ["not-on-vps"]);
  });
});

describe("a build stuck in the queue", () => {
  it("is flagged after 30 minutes, unless it's backing off for a retry", () => {
    const old = new Date(NOW - 45 * 60_000).toISOString();
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "queued", queueUpdatedAt: old }), ["build-stuck"]);
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "queued", queueUpdatedAt: new Date(NOW - 5 * 60_000).toISOString() }), []);
    assert.deepEqual(codes({ billingStatus: "active", queueStatus: "queued", queueUpdatedAt: old,
      queueRetryAt: new Date(NOW + 60_000).toISOString() }), []);
  });
});
