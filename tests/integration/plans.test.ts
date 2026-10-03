/**
 * Two plans and moving between them, end to end against the fake Razorpay:
 * upgrade now with a prorated charge and credit; downgrade at renewal; the
 * handover at the renewal date; abandoned changes; packs only with AI.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { caller, freshRazorpay, list, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => { await resetDb(); rzp.subscriptions.clear(); rzp.payments.clear(); rzp.calls.length = 0; });

const U = { uid: "u1", email: "k@example.com" };

/** A customer on `plan`, workspace live, ledger as the stamp would open it. */
async function onPlan(plan: "workspace" | "workspace_ai") {
  await seedUser(U.uid, U.email, { ws: "kamal" });
  const { startSubscription } = await import("@/lib/server/billing");
  const { subscriptionId } = await startSubscription(caller(U.uid, U.email), undefined, plan);
  rzp.authenticate(subscriptionId);
  await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
  const { initialLedgerFields } = await import("@/lib/server/credits");
  const { PLANS } = await import("@/lib/billing/plans");
  const { adminDb } = await import("@/lib/server/admin");
  await adminDb().doc("users/u1").update(initialLedgerFields({ includedUsd: PLANS[plan].aiUsd }));
  return subscriptionId;
}

async function change(to: string) {
  const { startPlanChange } = await import("@/lib/server/billing");
  return startPlanChange(caller(U.uid, U.email), to);
}

describe("the workspace-only plan", () => {
  it("subscribes on its own Razorpay plan; its key has no AI allowance", async () => {
    const subId = await onPlan("workspace");
    assert.equal(rzp.subscriptions.get(subId)?.plan_id, "plan_ws_inr");
    const u = await read("users/u1");
    assert.equal(u?.billing.plan, "workspace");
    assert.equal(u?.credits.includedUsd, 0);
  });

  it("can't buy credit packs (upgrade instead)", async () => {
    await onPlan("workspace");
    const { startTopup } = await import("@/lib/server/credits");
    await assert.rejects(startTopup(caller(U.uid, U.email), "s"), /Workspace \+ AI/);
  });
});

describe("upgrading: now, prorated, billing date unchanged", () => {
  it("charges the prorated difference upfront, grants the same share of credit, and hands over at renewal", async () => {
    const s1 = await onPlan("workspace");
    const r = await change("workspace_ai");
    assert.equal(r.kind, "upgrade");
    assert.ok(r.chargeNowMinor > 0 && r.creditNowUsd > 0);
    const s2 = rzp.subscriptions.get(r.subscriptionId)!;
    assert.equal(s2.plan_id, "plan_inr");
    assert.equal(s2.start_at, Math.floor(Date.parse(r.startsAt) / 1000)); // starts at the renewal date
    assert.equal((s2.addons as { item: { amount: number } }[])[0].item.amount, r.chargeNowMinor);
    assert.equal((await read("users/u1"))?.billing.upcoming.status, "created");

    // Checkout: mandate approved, the difference charged now.
    rzp.authenticate(s2.id);
    await webhook("subscription.authenticated", { subscription: rzp.subscriptions.get(s2.id)! });
    let u = await read("users/u1");
    assert.equal(u?.billing.subscriptionId, s1); // still on the old plan until renewal…
    assert.equal(u?.billing.upcoming.status, "authenticated");
    assert.equal(u?.billing.upcoming.oldCancelled, true); // …which is told to end at renewal
    assert.ok(rzp.calls.some((c) => c.path === `/subscriptions/${s1}/cancel` && c.body?.cancel_at_cycle_end === 1));
    const grant = u?.credits.pending.find((p: { type: string }) => p.type === "grant");
    assert.equal(grant.grant.usd, r.creditNowUsd); // …but the AI credit starts now
    assert.equal(grant.grant.expiresAt, r.startsAt);

    // A redelivered authentication grants nothing twice.
    await webhook("subscription.authenticated", { subscription: rzp.subscriptions.get(s2.id)! });
    u = await read("users/u1");
    assert.equal(u?.credits.pending.filter((p: { type: string }) => p.type === "grant").length, 1);

    // Renewal date: the old one ends first (no lapse, no pause)…
    rzp.subscriptions.get(s1)!.status = "cancelled";
    await webhook("subscription.cancelled", { subscription: rzp.subscriptions.get(s1)! });
    await worker("lifecycle", { dryRun: false });
    const opsAfterSweep = await list("workspace_ops");
    assert.ok(!opsAfterSweep.some((x) => (x as { op?: string }).op === "suspend"), "no pause during the handover");
    // …then the new one charges and takes over.
    rzp.start(s2.id);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(s2.id)! });
    u = await read("users/u1");
    assert.equal(u?.billing.subscriptionId, s2.id);
    assert.equal(u?.billing.plan, "workspace_ai");
    assert.equal(u?.billing.status, "active");
    assert.equal(u?.billing.upcoming, null);
    assert.ok(u?.credits.pending.some((p: { type: string; usd?: number }) => p.type === "set_included" && p.usd === 20));
  });

  it("is refused while cancelled or when already on the plan", async () => {
    await onPlan("workspace_ai");
    await assert.rejects(change("workspace_ai"), /already on/);
    const { cancelSubscription } = await import("@/lib/server/billing");
    await cancelSubscription(caller(U.uid, U.email));
    await assert.rejects(change("workspace"), /cancelled/);
  });
});

describe("downgrading: at renewal", () => {
  it("charges nothing now, keeps the AI allowance until renewal, then sets it to 0", async () => {
    const s1 = await onPlan("workspace_ai");
    const r = await change("workspace");
    assert.equal(r.kind, "downgrade");
    assert.equal(r.chargeNowMinor, 0);
    assert.equal((rzp.subscriptions.get(r.subscriptionId)!.addons ?? []).length, 0);
    rzp.authenticate(r.subscriptionId);
    await webhook("subscription.authenticated", { subscription: rzp.subscriptions.get(r.subscriptionId)! });
    let u = await read("users/u1");
    assert.equal(u?.credits.includedUsd, 20); // untouched until renewal
    assert.equal(u?.billing.upcoming.oldCancelled, true);
    rzp.subscriptions.get(s1)!.status = "cancelled";
    rzp.start(r.subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(r.subscriptionId)! });
    u = await read("users/u1");
    assert.equal(u?.billing.plan, "workspace");
    assert.ok(u?.credits.pending.some((p: { type: string; usd?: number }) => p.type === "set_included" && p.usd === 0));
  });

  it("a second change while one is set is refused", async () => {
    await onPlan("workspace_ai");
    const r = await change("workspace");
    rzp.authenticate(r.subscriptionId);
    await webhook("subscription.authenticated", { subscription: rzp.subscriptions.get(r.subscriptionId)! });
    await assert.rejects(change("workspace"), /already/);
  });
});

describe("changes that don't complete", () => {
  it("an abandoned checkout is reused for the same change, and dropped if it dies", async () => {
    await onPlan("workspace");
    const a = await change("workspace_ai");
    const b = await change("workspace_ai");
    assert.equal(a.subscriptionId, b.subscriptionId);
    rzp.subscriptions.get(a.subscriptionId)!.status = "expired";
    await worker("reconcile");
    const u = await read("users/u1");
    assert.equal(u?.billing.upcoming, null);
    assert.equal(u?.billing.plan, "workspace");
  });

  it("the reconciler completes a change whose webhook was missed", async () => {
    const s1 = await onPlan("workspace");
    const r = await change("workspace_ai");
    rzp.authenticate(r.subscriptionId); // no webhook
    await worker("reconcile");
    const u = await read("users/u1");
    assert.equal(u?.billing.upcoming.status, "authenticated");
    assert.ok(rzp.calls.some((c) => c.path === `/subscriptions/${s1}/cancel`));
  });

  it("cancelling mid-change cancels the change too", async () => {
    await onPlan("workspace");
    const r = await change("workspace_ai");
    rzp.authenticate(r.subscriptionId);
    await webhook("subscription.authenticated", { subscription: rzp.subscriptions.get(r.subscriptionId)! });
    const { cancelSubscription } = await import("@/lib/server/billing");
    await cancelSubscription(caller(U.uid, U.email));
    assert.equal(rzp.subscriptions.get(r.subscriptionId)?.status, "cancelled");
    assert.equal((await read("users/u1"))?.billing.upcoming, null);
  });
});
