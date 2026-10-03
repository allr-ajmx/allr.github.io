/** Removing workspaces and deleting accounts: money first, then data, all tidy. */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { admin, caller, freshRazorpay, list, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => { await resetDb(); rzp.subscriptions.clear(); rzp.payments.clear(); rzp.refunds.clear(); });

async function payingCustomer(uid = "u1", email = "k@example.com", ws = "kamal") {
  const { initialLedger, applyTopup } = await import("@/lib/billing/credits");
  await seedUser(uid, email, { ws });
  const { startSubscription } = await import("@/lib/server/billing");
  const { subscriptionId } = await startSubscription(caller(uid, email));
  rzp.charge(subscriptionId);
  await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
  const { adminDb } = await import("@/lib/server/admin");
  await adminDb().doc(`users/${uid}`).update({ credits: { ...applyTopup(initialLedger(), 9.2), usageUsd: 25 } });
  return subscriptionId;
}

async function finishRemoval(uid = "u1") {
  const op = (await list("workspace_ops")).find((o) => (o as { op?: string }).op === "remove") as { id: string; gen?: number };
  assert.ok(op, "a remove op was queued");
  const r = await worker("ops/complete", { id: op.id, ok: true, gen: op.gen });
  assert.equal(r.status, 200);
  return read(`users/${uid}`);
}

describe("removing a workspace", () => {
  it("cancels billing first, then the finished removal unlinks and rebases credit", async () => {
    const subId = await payingCustomer();
    await admin({ action: "remove", uid: "u1", confirm: "kamal" });
    assert.equal(rzp.subscriptions.get(subId)?.status, "cancelled");
    const u = await finishRemoval();
    assert.equal(u?.workspace_username, null);
    assert.equal(u?.billing.status, "ended");
    assert.equal(u?.credits.usageUsd, 0);
    assert.equal(u?.credits.includedLeftUsd, 0);
    assert.equal(u?.credits.topupBalanceUsd, 4.2); // 25 spent: 20 included + 5 of the 9.20 pack
  });

  it("a test-mode subscription doesn't block removal (regression)", async () => {
    await seedUser("u1", "k@example.com", {
      ws: "kamal",
      fields: { billing: { status: "ended", subscriptionId: "sub_test_mode", planCurrency: "INR", customerId: "c", currentPeriodEnd: null, providerStatus: "cancelled", statusSince: null } },
    });
    await admin({ action: "remove", uid: "u1", confirm: "kamal" });
    const u = await finishRemoval();
    assert.equal(u?.workspace_username, null);
  });

  it("the hourly sweep won't remove someone whose subscription is active again", async () => {
    const subId = await payingCustomer();
    const { adminDb } = await import("@/lib/server/admin");
    // our record says unpaid + suspended long ago; Razorpay says they paid
    await adminDb().doc("users/u1").update({
      "billing.status": "pastDue",
      enforcement: { status: "suspended", reason: "payment", suspendedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(), removeAfter: null },
    });
    await worker("lifecycle", { dryRun: false });
    assert.equal(rzp.subscriptions.get(subId)?.status, "active");
    assert.ok(!(await list("workspace_ops")).some((o) => (o as { op?: string }).op === "remove"));
  });
});

describe("deleting an account", () => {
  it("refuses while a workspace exists, then cleans everything once it's gone", async () => {
    await payingCustomer();
    await assert.rejects(admin({ action: "delete_account", uid: "u1", confirm: "k@example.com" }), /Remove the workspace/);
    await admin({ action: "remove", uid: "u1", confirm: "kamal" });
    await finishRemoval();
    await admin({ action: "delete_account", uid: "u1", confirm: "k@example.com" });
    assert.equal(await read("users/u1"), undefined);
    assert.equal(await read("workspace_usernames/kamal"), undefined);
    assert.equal(await read("provision_queue/u1"), undefined);
  });
});

describe("linking manual-era workspaces", () => {
  it("is an admin action, never a guess at sign-in", async () => {
    await seedUser("u1", "k@example.com");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("workspace_roster/kamal").set({ username: "kamal", email: "k@example.com", gone: false, updatedAt: new Date() });
    await admin({ action: "link_workspace", uid: "u1", username: "kamal" });
    const u = await read("users/u1");
    assert.equal(u?.workspace_username, "kamal");
    assert.ok(u?.credits, "a credit ledger is opened");
    assert.equal((await read("workspace_usernames/kamal"))?.uid, "u1");
  });

  it("refuses a workspace that's gone, or already someone else's", async () => {
    await seedUser("u1", "k@example.com");
    await seedUser("u2", "j@example.com", { ws: "taken" });
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("workspace_roster/ghost").set({ username: "ghost", email: "k@example.com", gone: true, updatedAt: new Date() });
    await adminDb().doc("workspace_roster/taken").set({ username: "taken", email: "j@example.com", gone: false, updatedAt: new Date() });
    await assert.rejects(admin({ action: "link_workspace", uid: "u1", username: "ghost" }), /isn't on the VPS/);
    await assert.rejects(admin({ action: "link_workspace", uid: "u1", username: "taken" }), /already/);
  });

  it("a different roster email is re-pointed to the account's", async () => {
    await seedUser("u1", "new@example.com");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("workspace_roster/kamal").set({ username: "kamal", email: "old@example.com", gone: false, updatedAt: new Date() });
    await admin({ action: "link_workspace", uid: "u1", username: "kamal" });
    assert.ok((await list("workspace_ops")).some((o) => (o as { op?: string }).op === "set_email"));
  });
});

describe("complimentary workspaces", () => {
  it("a paused free-week workspace made complimentary is resumed by the sweep, and never paused again", async () => {
    await seedUser("u1", "k@example.com", {
      ws: "kamal",
      fields: {
        trial: { startedAt: new Date("2026-08-01"), endsAt: new Date("2026-08-08"), creditUsd: 5, creditUsedUsd: 0 },
        enforcement: { status: "suspended", reason: "trial", suspendedAt: "2026-08-10T00:00:00.000Z", removeAfter: null },
      },
    });
    await admin({ action: "set_comp", uid: "u1", note: "founder" });
    await worker("lifecycle", { dryRun: false });
    const resume = (await list("workspace_ops")).find((o) => (o as { op?: string }).op === "resume");
    assert.ok(resume, "the sweep queued a resume");
    await worker("ops/complete", { id: (resume as { id: string }).id, ok: true, gen: (resume as { gen?: number }).gen });
    assert.equal((await read("users/u1"))?.enforcement, null);
    await worker("lifecycle", { dryRun: false });
    assert.ok(!(await list("workspace_ops")).some((o) => (o as { op?: string; status?: string }).op === "suspend"));
  });

  it("a complimentary note is required, and clearing it brings the normal rules back", async () => {
    await seedUser("u1", "k@example.com", { ws: "kamal" });
    await assert.rejects(admin({ action: "set_comp", uid: "u1", note: "" }), /Say why/);
    await admin({ action: "set_comp", uid: "u1", note: "partner", until: "2027-01-01" });
    assert.equal((await read("users/u1"))?.comp.note, "partner");
    await admin({ action: "clear_comp", uid: "u1" });
    assert.equal((await read("users/u1"))?.comp, null);
  });
});
