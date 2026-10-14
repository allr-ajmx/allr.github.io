/**
 * Email end to end: the events that owe someone an email queue exactly one
 * row each (webhooks redelivered, the reconciler, checkout's confirm all
 * agreeing on one key), the drain sends through whatever sender it is given
 * and never twice, failures back off, old rows expire, and the admin digest
 * is queued once per new flag.
 */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { admin, caller, freshRazorpay, list, read, resetDb, seedUser, webhook, worker } from "./harness.ts";
import type { FakeRazorpay } from "./fake-razorpay.ts";
import type { Outgoing } from "@/lib/server/mail";

let rzp: FakeRazorpay;
before(() => { rzp = freshRazorpay(); });
after(() => rzp.uninstall());
beforeEach(async () => {
  await resetDb();
  rzp.subscriptions.clear();
  rzp.payments.clear();
  rzp.orders.clear();
  delete process.env.ALLR_ADMIN_ALERT_EMAILS;
});

const U = { uid: "u1", email: "k@example.com" };

/** A sender that remembers everything, and can be told to fail. */
function recorder(fail = false) {
  const sent: Outgoing[] = [];
  const send = async (m: Outgoing) => {
    if (fail) throw new Error("SMTP 421 try later");
    sent.push(m);
    return { messageId: `<${sent.length}@test>` };
  };
  return { sent, send };
}

async function outbox() {
  return (await list("mail_outbox")) as Array<Record<string, unknown> & { id: string }>;
}

/** Seed in the US (no exchange-rate fetch), subscribe with $20 monthly credit, pay. */
async function paidSignup(creditUsd = 20) {
  await seedUser(U.uid, U.email, { country: "US" });
  const { startSubscription } = await import("@/lib/server/billing");
  const { subscriptionId } = await startSubscription(caller(U.uid, U.email), "kamal", creditUsd);
  rzp.charge(subscriptionId);
  await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subscriptionId)! });
  return subscriptionId;
}

describe("what gets queued", () => {
  it("the first payment queues one 'being built' email, however many times the webhook lands", async () => {
    const subId = await paidSignup();
    const sub = rzp.subscriptions.get(subId)!;
    await webhook("subscription.charged", { subscription: sub });
    await webhook("subscription.activated", { subscription: sub });
    const { syncSubscription } = await import("@/lib/server/subscriptions");
    await syncSubscription(subId, { source: "reconcile", uidHint: U.uid });
    const rows = await outbox();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, `workspace_building:u1:${subId}`);
    assert.equal(rows[0].to, U.email);
    assert.equal(rows[0].status, "queued");
    assert.deepEqual(rows[0].message, { kind: "workspace_building", username: "kamal", creditUsd: 20 });
  });

  it("the stamp queues 'live'; the same stamp again does not", async () => {
    await paidSignup(0);
    const stamp = { email: U.email, username: "kamal", workspaceEmail: U.email, address: "https://kamal.allr.work" };
    assert.equal((await worker("workspace", stamp)).status, 200);
    assert.equal((await worker("workspace", stamp)).status, 200);
    const ready = (await outbox()).filter((r) => r.id.startsWith("workspace_ready:"));
    assert.equal(ready.length, 1);
    assert.deepEqual(ready[0].message, { kind: "workspace_ready", username: "kamal", address: "https://kamal.allr.work" });
  });

  it("a renewal queues one 'payment received' per paid cycle, a failed charge one 'didn't go through'", async () => {
    const subId = await paidSignup();
    rzp.charge(subId);
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subId)! });
    await webhook("subscription.charged", { subscription: rzp.subscriptions.get(subId)! });
    let rows = await outbox();
    const renewal = rows.find((r) => r.id === `renewal_charged:u1:${subId}:2`);
    assert.ok(renewal, "keyed by paid_count");
    const m = renewal.message as { charge: { currency: string; amountMinor: number }; creditUsd: number };
    assert.equal(m.charge.currency, "USD");
    assert.ok(m.charge.amountMinor > 0, "the locked bill is what was charged");
    assert.equal(m.creditUsd, 20);

    rzp.subscriptions.get(subId)!.status = "halted";
    await webhook("subscription.halted", { subscription: rzp.subscriptions.get(subId)! });
    rows = await outbox();
    assert.equal(rows.filter((r) => r.id.startsWith("payment_failed:")).length, 1);
  });

  it("cancelling queues the confirmation with the date they keep until", async () => {
    const subId = await paidSignup();
    const { cancelSubscription } = await import("@/lib/server/billing");
    await cancelSubscription(caller(U.uid, U.email));
    const row = (await outbox()).find((r) => r.id === `cancellation_confirmed:u1:${subId}`);
    assert.ok(row);
    assert.equal((row.message as { endsAt: string }).endsAt, (await read("users/u1"))?.billing.currentPeriodEnd);
  });

  it("a credit pack queues 'added'; one that cannot be applied queues 'refunded' to the payer", async () => {
    await seedUser(U.uid, U.email, { ws: "kamal", country: "US" });
    const { initialLedger } = await import("@/lib/billing/credits");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ credits: initialLedger() });
    const { startTopup } = await import("@/lib/server/credits");
    const order = await startTopup(caller(U.uid, U.email), "s");
    const pay = rzp.payOrder(order.orderId);
    await webhook("payment.captured", { payment: pay });
    await webhook("payment.captured", { payment: pay });
    const added = (await outbox()).filter((r) => r.id.startsWith("credit_pack_added:"));
    assert.equal(added.length, 1);
    assert.deepEqual(added[0].message, { kind: "credit_pack_added", creditUsd: 10, paid: { amountMinor: pay.amount, currency: "USD" } });

    // No workspace any more: the next pack is refunded, and they're told.
    await adminDb().doc("users/u1").update({ workspace_username: null, workspace_email: null, workspace_address: null });
    const { createOrder } = await import("@/lib/server/razorpay");
    const stray = await createOrder(1000, "USD", { kind: "topup", uid: U.uid, email: U.email, pack: "s", credit_usd: "10" });
    const pay2 = rzp.payOrder(stray.id);
    await webhook("payment.captured", { payment: pay2 });
    const refunded = (await outbox()).find((r) => r.id === `credit_pack_refunded:u1:${pay2.id}`);
    assert.ok(refunded);
    assert.equal((refunded.message as { why: string }).why, "no-workspace");
    assert.equal(refunded.to, U.email);
  });

  it("sign-up queues the welcome; a promo code queues 'free month started'", async () => {
    const { createProfile } = await import("@/lib/server/profiles");
    await createProfile(caller("u9", "new@example.com"), {
      name: "New Person", confirmedOver18: true, country: "US", accountType: "individual", entityName: "", marketingOptIn: false,
    });
    assert.equal((await outbox()).filter((r) => r.id === "welcome:u9").length, 1);

    await seedUser(U.uid, U.email, { country: "US" });
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("promo_codes/LAUNCH").set({ code: "LAUNCH", active: true, maxUses: 10, uses: 0, expiresAt: null, days: 30, creditUsd: 5 });
    const { redeemPromo } = await import("@/lib/server/promo");
    const promo = await redeemPromo(caller(U.uid, U.email), "launch", "kamal");
    const row = (await outbox()).find((r) => r.id === "promo_started:u1:LAUNCH");
    assert.ok(row);
    assert.deepEqual(row.message, { kind: "promo_started", username: "kamal", endsAt: promo.endsAt, creditUsd: 5 });
  });

  it("the enforcer's pause queues 'paused' with the removal date, and the reminder once, only when armed", async () => {
    await paidSignup();
    const { adminDb } = await import("@/lib/server/admin");
    const stamp = { email: U.email, username: "kamal", workspaceEmail: U.email, address: "https://kamal.allr.work" };
    await worker("workspace", stamp);
    // Payment failing for longer than the grace period.
    const since = new Date(Date.now() - 5 * 86_400_000).toISOString();
    await adminDb().doc("users/u1").update({ "billing.status": "pastDue", "billing.statusSince": since });
    assert.equal((await worker("lifecycle", { dryRun: true })).status, 200);
    assert.equal((await outbox()).filter((r) => r.id.startsWith("workspace_paused:")).length, 0, "a rehearsal sends nothing");
    assert.equal((await worker("lifecycle", { dryRun: false })).status, 200);
    const paused = (await outbox()).filter((r) => r.id.startsWith("workspace_paused:"));
    assert.equal(paused.length, 1);
    const pm = paused[0].message as { cause: string; removeAfter: string | null };
    assert.equal(pm.cause, "payment");
    assert.ok(pm.removeAfter);

    // Twelve days later, still unpaid: the reminder, and only one.
    const suspendedAt = new Date(Date.now() - 12 * 86_400_000).toISOString();
    await adminDb().doc("users/u1").update({ "enforcement.suspendedAt": suspendedAt });
    await worker("lifecycle", { dryRun: false });
    await worker("lifecycle", { dryRun: false });
    const reminders = (await outbox()).filter((r) => r.id.startsWith("removal_reminder:"));
    assert.equal(reminders.length, 1);
    assert.equal((reminders[0].message as { daysLeft: number }).daysLeft, 2);
    assert.ok((await read("users/u1"))?.enforcement.removalReminderAt);
  });
});

describe("the drain", () => {
  it("is off until SMTP is configured, and the route says so", async () => {
    await paidSignup(0);
    const { drainOutbox } = await import("@/lib/server/mail");
    const r = await drainOutbox();
    assert.equal(r.disabled, true);
    assert.equal((await outbox())[0].status, "queued");
    const res = await worker("mail/drain");
    assert.equal(res.status, 200);
    assert.equal(res.body.disabled, true);
  });

  it("sends each queued row once, renders the real words, and never resends a sent key", async () => {
    const subId = await paidSignup();
    const { drainOutbox, enqueueMailNow } = await import("@/lib/server/mail");
    const r1 = recorder();
    const s1 = await drainOutbox({ send: r1.send });
    assert.equal(s1.sent, 1);
    assert.equal(r1.sent[0].to, U.email);
    assert.equal(r1.sent[0].subject, "Payment received — your workspace is on its way");
    assert.ok(r1.sent[0].html.includes("kamal.allr.work is being built now"));
    assert.ok(r1.sent[0].text.includes("https://"));
    assert.equal(r1.sent[0].headers?.["X-Allr-Mail"], `workspace_building:u1:${subId}`);
    const row = (await outbox())[0];
    assert.equal(row.status, "sent");
    assert.equal(row.messageId, "<1@test>");

    // The same event again (a late redelivery after the row was sent).
    await enqueueMailNow({ uid: U.uid, to: U.email, message: { kind: "workspace_building", username: "kamal", creditUsd: 20 }, ref: subId });
    assert.equal((await outbox())[0].status, "queued", "re-enqueue reopens the row…");
    const r2 = recorder();
    const s2 = await drainOutbox({ send: r2.send });
    assert.equal(r2.sent.length, 0, "…but the drain sees it was sent and sends nothing");
    assert.equal(s2.sent, 0);
    assert.equal((await outbox())[0].status, "sent");
  });

  it("backs off after a failure, retries when due, and gives up after the last attempt", async () => {
    await paidSignup(0);
    const { drainOutbox } = await import("@/lib/server/mail");
    const now = new Date("2026-10-14T10:00:00Z");
    const failing = recorder(true);
    const s1 = await drainOutbox({ send: failing.send, now });
    assert.equal(s1.retried, 1);
    let row = (await outbox())[0];
    assert.equal(row.status, "queued");
    assert.equal(row.attempts, 1);
    assert.equal(row.retryAt, "2026-10-14T10:01:00.000Z");
    assert.ok(String(row.lastError).includes("421"));

    const s2 = await drainOutbox({ send: recorder().send, now: new Date("2026-10-14T10:00:30Z") });
    assert.equal(s2.sent, 0, "not due yet");
    const ok = recorder();
    const s3 = await drainOutbox({ send: ok.send, now: new Date("2026-10-14T10:02:00Z") });
    assert.equal(s3.sent, 1);
    assert.equal((await outbox())[0].status, "sent");

    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc(`mail_outbox/${row.id}`).update({ status: "queued", sentAt: null, attempts: 7, retryAt: null });
    const s4 = await drainOutbox({ send: failing.send, now: new Date("2026-10-15T10:00:00Z") });
    assert.equal(s4.failed, 1);
    row = (await outbox())[0];
    assert.equal(row.status, "failed");
    assert.equal(row.attempts, 8);
  });

  it("expires rows older than three days instead of sending stale news", async () => {
    await paidSignup(0);
    const { drainOutbox } = await import("@/lib/server/mail");
    const r = recorder();
    const s = await drainOutbox({ send: r.send, now: new Date(Date.now() + 4 * 86_400_000) });
    assert.equal(s.expired, 1);
    assert.equal(r.sent.length, 0);
    assert.equal((await outbox())[0].status, "expired");
  });

  it("takes over a claim left by a function that died mid-send", async () => {
    await paidSignup(0);
    const { drainOutbox } = await import("@/lib/server/mail");
    const { adminDb } = await import("@/lib/server/admin");
    const id = (await outbox())[0].id;
    await adminDb().doc(`mail_outbox/${id}`).update({ status: "sending", claimedAt: new Date(Date.now() - 10 * 60_000).toISOString() });
    const r = recorder();
    assert.equal((await drainOutbox({ send: r.send })).sent, 1);
    await adminDb().doc(`mail_outbox/${id}`).update({ status: "sending", sentAt: null, claimedAt: new Date().toISOString() });
    assert.equal((await drainOutbox({ send: r.send })).sent, 0, "a live claim is left alone");
  });
});

describe("the admin digest", () => {
  it("queues one digest per admin for new flags and failed builds, stamps them, and stays quiet after", async () => {
    process.env.ALLR_ADMIN_ALERT_EMAILS = "ops@allr.test, jai@allr.test";
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("billing_events/reconcile:pay_1").set({
      eventName: "payment.captured", uid: "u1", paymentId: "pay_1", outcome: "applied-by-reconcile",
      reason: "webhook missed — $10.00 top-up applied from Razorpay", flag: true, resolved: false, receivedAt: new Date(),
    });
    await adminDb().doc("billing_events/quiet").set({ eventName: "sync:webhook", outcome: "applied", flag: false, receivedAt: new Date() });
    await adminDb().doc("provision_queue/u2").set({ uid: "u2", email: "b@example.com", username: "bob", status: "failed", error: "docker pull failed", attempts: 3 });
    const { alertAdmins, drainOutbox } = await import("@/lib/server/mail");
    const a1 = await alertAdmins();
    assert.deepEqual(a1, { items: 2, recipients: 2, enqueued: true });
    const digests = (await outbox()).filter((r) => r.id.startsWith("admin_digest:"));
    assert.equal(digests.length, 2);
    assert.deepEqual(digests.map((d) => d.to).sort(), ["jai@allr.test", "ops@allr.test"]);
    assert.ok((await read("billing_events/reconcile:pay_1"))?.alertedAt);
    assert.ok((await read("provision_queue/u2"))?.alertedAt);
    assert.equal((await read("billing_events/quiet"))?.alertedAt, undefined);

    const r = recorder();
    assert.equal((await drainOutbox({ send: r.send })).sent, 2);
    assert.equal(r.sent[0].subject, "Needs attention: 2 items");
    assert.ok(r.sent[0].html.includes("Provisioning failed") && r.sent[0].html.includes("Webhook missed"));
    assert.ok(!r.sent[0].html.includes("Hi "), "no greeting on admin mail");

    assert.deepEqual(await alertAdmins(), { items: 0, recipients: 2, enqueued: false });
    assert.equal((await outbox()).filter((r) => r.id.startsWith("admin_digest:")).length, 2);
  });

  it("with no recipients configured, nothing is queued and nothing is stamped", async () => {
    delete process.env.ALLR_ADMIN_UI_EMAILS;
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("billing_events/x").set({ eventName: "webhook", outcome: "rejected", reason: "r", flag: true, resolved: false, receivedAt: new Date() });
    const { alertAdmins } = await import("@/lib/server/mail");
    assert.deepEqual(await alertAdmins(), { items: 0, recipients: 0, enqueued: false });
    assert.equal((await read("billing_events/x"))?.alertedAt, undefined);
  });
});

describe("the five added emails", () => {
  it("an email transfer tells the old address and the new one", async () => {
    await seedUser(U.uid, U.email, { ws: "kamal", country: "US" });
    await admin({ action: "transfer_email", uid: U.uid, email: "new@example.com" });
    const rows = (await outbox()).filter((r) => r.id.startsWith("email_transferred"));
    assert.equal(rows.length, 2);
    const out = rows.find((r) => r.id.startsWith("email_transferred_out:"))!;
    const into = rows.find((r) => r.id.startsWith("email_transferred_in:"))!;
    assert.equal(out.to, U.email);
    assert.deepEqual(out.message, { kind: "email_transferred_out", newEmail: "new@example.com" });
    assert.equal(into.to, "new@example.com");
    assert.deepEqual(into.message, { kind: "email_transferred_in", oldEmail: U.email, username: "kamal" });
  });

  it("deleting an account tells the address that was deleted", async () => {
    await seedUser(U.uid, U.email, { country: "US" });
    await admin({ action: "delete_account", uid: U.uid, confirm: U.email });
    assert.equal(await read("users/u1"), undefined);
    const row = (await outbox()).find((r) => r.id === "account_deleted:u1");
    assert.ok(row);
    assert.equal(row.to, U.email);
  });

  it("a build that gives up tells the person it's in hand — once per build", async () => {
    await paidSignup(0);
    for (let i = 0; i < 3; i++) {
      assert.equal((await worker("provision-queue/complete", { uid: U.uid, ok: false, error: "docker pull failed" })).status, 200);
    }
    assert.equal((await read("provision_queue/u1"))?.status, "failed");
    const rows = (await outbox()).filter((r) => r.id.startsWith("provisioning_delayed:"));
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].message, { kind: "provisioning_delayed", username: "kamal" });
    // A fourth verdict (the VPS retrying its report) adds nothing.
    await worker("provision-queue/complete", { uid: U.uid, ok: false, error: "docker pull failed" });
    assert.equal((await outbox()).filter((r) => r.id.startsWith("provisioning_delayed:")).length, 1);
  });

  it("live usage says 'low' once, then 'used up' once, re-armed by a top-up — and never clobbers the ledger", async () => {
    await seedUser(U.uid, U.email, { ws: "kamal", country: "US" });
    const { addPurchased, initialLedger } = await import("@/lib/billing/credits");
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ credits: addPurchased(initialLedger(), 10) });
    const { ingestUsage } = await import("@/lib/server/credits");
    const push = (usageUsd: number) => ingestUsage([{ email: U.email, usageUsd, username: "kamal" }]);

    assert.equal(await push(5), 1);
    assert.equal((await outbox()).length, 0);
    await push(9.2);
    let rows = await outbox();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "credit_low:u1:1000");
    assert.deepEqual(rows[0].message, { kind: "credit_low", username: "kamal", availableUsd: 0.8 });
    await push(9.3);
    assert.equal((await outbox()).length, 1, "low is said once");
    await push(10);
    rows = await outbox();
    assert.equal(rows.length, 2);
    assert.ok(rows.some((r) => r.id === "credit_out:u1:1000"));
    const u = await read("users/u1");
    assert.equal(u?.credits.purchasedUsd, 10, "usage ingest writes only the usage fields");
    assert.equal(u?.credits.usageUsd, 10);
    assert.equal(u?.credits.targetLimitUsd, 10);
    assert.equal(u?.creditAlerts.basisUsd, 10);

    // Credit added: the next low is a new email, keyed by the new balance.
    await adminDb().doc("users/u1").update({ "credits.purchasedUsd": 20 });
    await push(10.5);
    assert.equal((await outbox()).length, 2);
    await push(19.5);
    assert.ok((await outbox()).some((r) => r.id === "credit_low:u1:2000"));

    // A report for a workspace this account no longer has is ignored.
    assert.equal(await ingestUsage([{ email: U.email, usageUsd: 50, username: "oldname" }]), 0);
    assert.equal((await read("users/u1"))?.credits.usageUsd, 19.5);
  });

  it("the free month ending in two days is announced once, armed or not — and never to a subscriber", async () => {
    const { Timestamp } = await import("firebase-admin/firestore");
    const endsAt = new Date(Date.now() + 2 * 86_400_000);
    const trial = { startedAt: Timestamp.fromDate(new Date(Date.now() - 28 * 86_400_000)), endsAt: Timestamp.fromDate(endsAt), creditUsd: 5, creditUsedUsd: 0 };
    await seedUser(U.uid, U.email, { ws: "kamal", country: "US", fields: { trial, promo: { code: "LAUNCH", redeemedAt: "x", endsAt: endsAt.toISOString(), creditUsd: 5 } } });
    await seedUser("u2", "paid@example.com", { ws: "paid", country: "US", fields: { trial, billing: { subscriptionId: "sub_x", status: "active", planCurrency: "USD", plan: "workspace" } } });
    assert.equal((await worker("lifecycle", { dryRun: true })).status, 200);
    await worker("lifecycle", { dryRun: true });
    const rows = (await outbox()).filter((r) => r.id.startsWith("trial_ending:"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].to, U.email);
    const m = rows[0].message as { promo: boolean; daysLeft: number; endsAt: string };
    assert.equal(m.promo, true);
    assert.equal(m.daysLeft, 2);
    assert.equal(m.endsAt, endsAt.toISOString());
    assert.ok((await read("users/u1"))?.trial.endingReminderAt);
  });
});
