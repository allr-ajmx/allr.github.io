/** Promo codes through the real transaction: caps, one per email, the build. */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { admin, caller, freshRazorpay, ops, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => {
  await resetDb();
  rzp.subscriptions.clear(); rzp.payments.clear(); rzp.orders.clear(); rzp.plans.clear();
  rzp.calls.length = 0; rzp.fxRate = 90;
});

async function redeem(uid: string, email: string, code: string, username: string) {
  const { redeemPromo } = await import("@/lib/server/promo");
  return redeemPromo(caller(uid, email), code, username);
}

describe("promo codes", () => {
  it("redeems once per email, counts the use, queues the build", async () => {
    await admin({ action: "promo_create", code: "LAUNCH", maxUses: 2 });
    await seedUser("u1", "a@example.com");
    const p = await redeem("u1", "a@example.com", "launch", "amara");
    assert.equal(p.creditUsd, 5);
    assert.equal((await read("promo_codes/LAUNCH"))?.uses, 1);
    assert.equal((await read("provision_queue/u1"))?.status, "queued");
    assert.equal((await read("users/u1"))?.promo.code, "LAUNCH");
    await assert.rejects(redeem("u1", "a@example.com", "LAUNCH", "amara"), /already/i);
  });

  it("the cap holds", async () => {
    await admin({ action: "promo_create", code: "ONE", maxUses: 1 });
    await seedUser("u1", "a@example.com");
    await seedUser("u2", "b@example.com");
    await redeem("u1", "a@example.com", "ONE", "amara");
    await assert.rejects(redeem("u2", "b@example.com", "ONE", "bilal"), /fully used/i);
  });

  it("a switched-off code can't be redeemed", async () => {
    await admin({ action: "promo_create", code: "OFF", maxUses: 5 });
    await admin({ action: "promo_set_active", code: "OFF", active: false });
    await seedUser("u1", "a@example.com");
    await assert.rejects(redeem("u1", "a@example.com", "OFF", "amara"), /isn.t active/i);
  });
});

describe("a free month reaches the key", () => {
  it("the claim carries the promo's credit, and the stamp's sync_limit settles on it", async () => {
    await admin({ action: "promo_create", code: "SEVEN", maxUses: 5, creditUsd: 7 });
    await seedUser("u1", "a@example.com");
    await redeem("u1", "a@example.com", "SEVEN", "amara");

    const claim = await worker("provision-queue/claim");
    assert.equal(claim.status, 200);
    assert.equal(claim.body.limitUsd, 7);

    await worker("workspace", {
      email: "a@example.com", username: "amara", workspaceEmail: "a@example.com", address: "https://amara.allr.work",
    });
    assert.equal((await read("users/u1"))?.credits.purchasedUsd, 7);
    const sync = (await ops()).find((o) => o.op === "sync_limit")!;
    const resolved = await worker("ops/resolve", { id: sync.id, usageUsd: 0 });
    assert.equal(resolved.body.limitUsd, 7);
  });
});

describe("workspace-waived codes", () => {
  const U = { uid: "u1", email: "w@example.com" };
  const subscribe = async (credit = 0) => {
    const { startSubscription } = await import("@/lib/server/billing");
    return startSubscription(caller(U.uid, U.email), undefined, credit);
  };
  const created = () => rzp.calls.filter((c) => c.method === "POST" && c.path === "/subscriptions");

  it("redeeming records the waiver and builds nothing until they pay", async () => {
    await admin({ action: "promo_create", code: "TEAM", kind: "waive_workspace", maxUses: 5, waiveMonths: 3 });
    await seedUser(U.uid, U.email, { country: "US" });
    const r = await redeem(U.uid, U.email, "team", "wren");
    assert.equal(r.kind, "waive_workspace");
    assert.equal((await read("users/u1"))?.waiver.creditUsd, 20);
    assert.equal((await read("promo_codes/TEAM"))?.uses, 1);
    assert.equal(await read("provision_queue/u1"), undefined);
    assert.equal((await read("users/u1"))?.trial, null);
  });

  it("checkout charges only the AI credit (+ GST), for the waived months, whatever credit is asked", async () => {
    await admin({ action: "promo_create", code: "TEAM", kind: "waive_workspace", maxUses: 5, waiveMonths: 3 });
    await seedUser(U.uid, U.email, { country: "US" });
    await redeem(U.uid, U.email, "TEAM", "wren");
    const r = await subscribe(50);
    // $20 + 18% GST = $23.60; no workspace line.
    assert.equal(r.creditUsd, 20);
    assert.equal(r.quote.totalMinor, 23_60);
    assert.deepEqual(r.quote.lines.map((l) => l.label), ["AI credit"]);
    assert.equal(created()[0].body?.total_count, 3);
    const sub = rzp.subscriptions.get(r.subscriptionId)!;
    assert.equal(sub.notes.waived, "1");
    assert.equal(sub.notes.promo_code, "TEAM");
    assert.deepEqual((await read("users/u1"))?.billing.waived, { code: "TEAM", months: 3 });
  });

  it("paid: built with $20 credit each month; the waiver is spent, so the next checkout is full price", async () => {
    await admin({ action: "promo_create", code: "TEAM", kind: "waive_workspace", maxUses: 5, waiveMonths: 3 });
    await seedUser(U.uid, U.email, { country: "US" });
    await redeem(U.uid, U.email, "TEAM", "wren");
    const { subscriptionId } = await subscribe();
    rzp.charge(subscriptionId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
    let u = await read("users/u1");
    assert.equal(u?.billing.status, "active");
    assert.equal(u?.credits.purchasedUsd, 20);
    assert.equal((await read("provision_queue/u1"))?.status, "queued");
    assert.equal((await worker("provision-queue/claim")).body.limitUsd, 20);

    // Razorpay completes it after the last waived month.
    rzp.subscriptions.get(subscriptionId)!.status = "completed";
    await webhook("subscription.completed", { subscription: rzp.subscriptions.get(subscriptionId)! });
    u = await read("users/u1");
    assert.equal(u?.billing.status, "ended");

    const again = await subscribe(20);
    assert.notEqual(again.subscriptionId, subscriptionId);
    // $10 workspace + $20 credit + 18% GST = $35.40, open-ended.
    assert.equal(again.quote.totalMinor, 35_40);
    assert.equal(created().at(-1)?.body?.total_count, 120);
    assert.equal(rzp.subscriptions.get(again.subscriptionId)!.notes.waived, undefined);
  });

  it("an abandoned waived checkout is reused, not spent", async () => {
    await admin({ action: "promo_create", code: "FOREVER", kind: "waive_workspace", maxUses: 5 });
    await seedUser(U.uid, U.email, { country: "US" });
    await redeem(U.uid, U.email, "FOREVER", "wren");
    const a = await subscribe();
    const b = await subscribe();
    assert.equal(b.subscriptionId, a.subscriptionId);
    assert.equal(created()[0].body?.total_count, 120); // no end
  });
});
