/**
 * Credit packs, refunds, disputes: money in and money back, from every
 * direction (webhook, reconciler, admin, Razorpay dashboard), applied once.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { admin, caller, freshRazorpay, list, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => { await resetDb(); rzp.payments.clear(); rzp.refunds.clear(); rzp.orders.clear(); });

async function ledger() {
  const { initialLedger } = await import("@/lib/billing/credits");
  return initialLedger();
}

async function buyPack(uid: string, email: string, pack = "s") {
  const { startTopup } = await import("@/lib/server/credits");
  const order = await startTopup(caller(uid, email), pack);
  return order;
}

describe("buying a credit pack", () => {
  it("credits a live workspace once and raises its key limit", async () => {
    await seedUser("u1", "a@example.com", { ws: "alpha", fields: { credits: await ledger() } });
    const order = await buyPack("u1", "a@example.com");
    const pay = rzp.payOrder(order.orderId);
    await webhook("payment.captured", { payment: pay });
    await webhook("payment.captured", { payment: pay }); // redelivered
    const u = await read("users/u1");
    assert.equal(u?.credits.topupBalanceUsd, 10);
    assert.equal((await read(`credit_purchases/${pay.id}`))?.status, "applied");
    const sync = (await list("workspace_ops")).find((o) => (o as { op?: string }).op === "sync_limit");
    assert.ok(sync);
  });

  it("refuses to sell a pack without a workspace", async () => {
    await seedUser("u1", "a@example.com");
    await assert.rejects(buyPack("u1", "a@example.com"), /live workspace|Subscribe/i);
  });

  it("an authorized-only payment is captured, then credited", async () => {
    await seedUser("u1", "a@example.com", { ws: "alpha", fields: { credits: await ledger() } });
    const order = await buyPack("u1", "a@example.com");
    const pay = rzp.payOrder(order.orderId, "authorized");
    await webhook("payment.authorized", { payment: pay });
    assert.equal(rzp.payments.get(pay.id)?.status, "captured");
    assert.equal((await read("users/u1"))?.credits.topupBalanceUsd, 10);
  });

  it("money for an account with no workspace is refunded automatically", async () => {
    await seedUser("u1", "a@example.com", { ws: "alpha", fields: { credits: await ledger() } });
    const order = await buyPack("u1", "a@example.com");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ workspace_username: null, workspace_email: null, workspace_address: null });
    const pay = rzp.payOrder(order.orderId);
    await webhook("payment.captured", { payment: pay });
    assert.equal(rzp.payments.get(pay.id)?.amount_refunded, pay.amount);
    assert.equal((await read(`credit_purchases/${pay.id}`))?.status, "refunded");
    assert.equal((await read("users/u1"))?.credits.topupBalanceUsd, 0);
  });

  it("an account that moved to a new login still gets its pack (matched by email)", async () => {
    await seedUser("old", "a@example.com", { ws: "alpha", fields: { credits: await ledger() } });
    const order = await buyPack("old", "a@example.com");
    const { adminDb } = await import("@/lib/server/admin");
    const data = (await adminDb().doc("users/old").get()).data()!;
    await adminDb().doc("users/new").set({ ...data, uid: "new" });
    await adminDb().doc("users/old").delete();
    const { createHash } = await import("node:crypto");
    await adminDb().doc(`user_emails/${createHash("sha256").update("a@example.com").digest("hex")}`).set({ uid: "new", email: "a@example.com" });
    const pay = rzp.payOrder(order.orderId);
    await webhook("payment.captured", { payment: pay });
    assert.equal((await read("users/new"))?.credits.topupBalanceUsd, 10);
  });

  it("an older ledger (before includedLeftUsd existed) can still be credited (regression)", async () => {
    await seedUser("u1", "a@example.com", {
      ws: "alpha",
      fields: { credits: { includedUsd: 20, cycleStartUsageUsd: 0, topupBalanceUsd: 0, targetLimitUsd: 20, usageUsd: 0, usageSyncedAt: null } },
    });
    const order = await buyPack("u1", "a@example.com");
    const pay = rzp.payOrder(order.orderId);
    assert.equal((await webhook("payment.captured", { payment: pay })).status, 200);
    assert.equal((await read("users/u1"))?.credits.topupBalanceUsd, 10);
  });

  it("a pack the webhook never reported is found by the reconciler and flagged", async () => {
    await seedUser("u1", "a@example.com", { ws: "alpha", fields: { credits: await ledger() } });
    const order = await buyPack("u1", "a@example.com");
    rzp.payOrder(order.orderId); // no webhook
    await worker("reconcile");
    assert.equal((await read("users/u1"))?.credits.topupBalanceUsd, 10);
    const flagged = (await list("billing_events")).filter((e) => (e as { flag?: boolean }).flag);
    assert.ok(flagged.some((e) => /webhook missed/.test(String((e as { reason?: string }).reason))));
  });
});

describe("money going back", () => {
  async function paidPack() {
    await seedUser("u1", "a@example.com", { ws: "alpha", fields: { credits: await ledger() } });
    const order = await buyPack("u1", "a@example.com");
    const pay = rzp.payOrder(order.orderId);
    await webhook("payment.captured", { payment: pay });
    return pay;
  }

  it("a dashboard refund on a pack takes back the unspent credit, once", async () => {
    const pay = await paidPack();
    const refund = rzp.dashboardRefund(pay.id);
    await webhook("refund.processed", { refund, payment: pay });
    await worker("reconcile"); // the same refund via the safety net
    const credits = (await read("users/u1"))?.credits;
    assert.deepEqual(credits.pending, [{ type: "refund_topup", usd: 10 }]);
    assert.equal((await read(`credit_purchases/${pay.id}`))?.status, "refunded");
  });

  it("an admin refunds a pack from the panel", async () => {
    const pay = await paidPack();
    await admin({ action: "refund_topup", paymentId: pay.id });
    assert.equal(rzp.payments.get(pay.id)?.amount_refunded, pay.amount);
    assert.deepEqual((await read("users/u1"))?.credits.pending, [{ type: "refund_topup", usd: 10 }]);
    await assert.rejects(admin({ action: "refund_topup", paymentId: pay.id }), /Already refunded/);
  });

  it("a refund outside Allr on a subscription payment is flagged for a person", async () => {
    await seedUser("u1", "a@example.com");
    const subPay = rzp.addPayment({ amount: 249900, currency: "INR", invoice_id: "inv_1" });
    const refund = rzp.dashboardRefund(subPay.id);
    await webhook("refund.processed", { refund, payment: subPay });
    const ev = await read(`billing_events/refund:${refund.id}`);
    assert.equal(ev?.flag, true);
    assert.equal(ev?.outcome, "needs-decision");
  });

  it("disputes are flagged", async () => {
    await webhook("payment.dispute.created", { dispute: { id: "disp_1", payment_id: "pay_x", amount: 89900, phase: "chargeback", reason_code: "fraud" } });
    assert.equal((await read("billing_events/dispute:disp_1:payment.dispute.created"))?.flag, true);
  });
});
