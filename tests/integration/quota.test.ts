/**
 * The worker's background ticks must not cost Firestore writes when nothing
 * changed. Rewriting every roster row and every ledger each minute ran the
 * project's daily quota dry and took the whole site (sign-in included) down
 * with RESOURCE_EXHAUSTED. These pin "identical push → zero document writes",
 * using each document's server-side updateTime as the witness.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { read, resetDb, seedUser, worker } from "./harness.ts";

beforeEach(async () => {
  await resetDb();
  process.env.ALLR_ADMIN_ALERT_EMAILS = "ops@allr.test";
});

const U = { uid: "u1", email: "k@example.com" };
const item = (over: Record<string, unknown> = {}) => ({
  username: "kamal", email: U.email, suspended: false, agentTag: "v1", helixTag: "h1",
  orManaged: true, orDisabled: false, orLimitUsd: 20, orUsageUsd: 3, orUsageDailyUsd: 1, orUsageMonthlyUsd: 3,
  orHealth: "ok", ...over,
});

async function updateTime(path: string) {
  const { adminDb } = await import("@/lib/server/admin");
  return (await adminDb().doc(path).get()).updateTime?.toMillis();
}

async function seedLedger() {
  await seedUser(U.uid, U.email, { ws: "kamal", country: "US" });
  const { addPurchased, initialLedger } = await import("@/lib/billing/credits");
  const { adminDb } = await import("@/lib/server/admin");
  await adminDb().doc("users/u1").update({ credits: addPurchased(initialLedger(), 20) });
}

describe("roster push", () => {
  it("an identical push writes nothing; a changed field writes that row", async () => {
    await seedLedger();
    const first = await worker("roster", { items: [item(), item({ username: "other", email: "o@example.com", orUsageUsd: undefined })] });
    assert.equal(first.status, 200);
    assert.equal(first.body.written, 2);
    const t1 = await updateTime("workspace_roster/kamal");
    const u1 = await updateTime("users/u1");

    const again = await worker("roster", { items: [item(), item({ username: "other", email: "o@example.com", orUsageUsd: undefined })] });
    assert.equal(again.status, 200);
    assert.equal(again.body.written, 0, "nothing changed, nothing written");
    assert.equal(again.body.metered, 1, "unchanged usage still counts as applied");
    assert.equal(await updateTime("workspace_roster/kamal"), t1);
    assert.equal(await updateTime("users/u1"), u1, "the ledger is not rewritten for the same usage");

    const changed = await worker("roster", { items: [item({ suspended: true }), item({ username: "other", email: "o@example.com", orUsageUsd: undefined })] });
    assert.equal(changed.body.written, 1);
    assert.equal((await read("workspace_roster/kamal"))?.suspended, true);
    assert.ok((await read("workspace_roster/kamal"))?.firstSeenAt, "firstSeenAt survives");
  });

  it("an unchanged row is still re-stamped once its heartbeat is stale", async () => {
    await worker("roster", { items: [item()] });
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("workspace_roster/kamal").update({ updatedAt: new Date(Date.now() - 31 * 60_000) });
    const res = await worker("roster", { items: [item()] });
    assert.equal(res.body.written, 1);
  });

  it("a row the push no longer lists is marked gone once, and back when listed again", async () => {
    await worker("roster", { items: [item(), item({ username: "bob", email: "b@example.com" })] });
    const r1 = await worker("roster", { items: [item()] });
    assert.equal(r1.body.written, 1);
    assert.equal((await read("workspace_roster/bob"))?.gone, true);
    const r2 = await worker("roster", { items: [item()] });
    assert.equal(r2.body.written, 0, "already gone: not re-marked");
    const r3 = await worker("roster", { items: [item(), item({ username: "bob", email: "b@example.com" })] });
    assert.equal(r3.body.written, 1);
    assert.equal((await read("workspace_roster/bob"))?.gone, false);
  });
});

describe("usage ingest", () => {
  it("moved usage is written; the same usage again is not, until the heartbeat", async () => {
    await seedLedger();
    const { ingestUsage } = await import("@/lib/server/credits");
    const push = (usageUsd: number) => ingestUsage([{ email: U.email, usageUsd, username: "kamal" }]);
    assert.equal(await push(4), 1);
    const t1 = await updateTime("users/u1");
    assert.equal(await push(4), 1);
    assert.equal(await updateTime("users/u1"), t1);
    assert.equal(await push(4.5), 1);
    assert.equal((await read("users/u1"))?.credits.usageUsd, 4.5);

    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("users/u1").update({ "credits.usageSyncedAt": new Date(Date.now() - 16 * 60_000).toISOString() });
    const t2 = await updateTime("users/u1");
    assert.equal(await push(4.5), 1);
    assert.notEqual(await updateTime("users/u1"), t2, "stale 'last reported' is refreshed");
  });
});

describe("admin digest", () => {
  it("reads only flagged events: a pile of unflagged unresolved rows is never touched", async () => {
    const { adminDb } = await import("@/lib/server/admin");
    const batch = adminDb().batch();
    for (let i = 0; i < 30; i++) {
      batch.set(adminDb().doc(`billing_events/noise${i}`), { eventName: "webhook", outcome: "applied", flag: false, resolved: false, receivedAt: new Date() });
    }
    batch.set(adminDb().doc("billing_events/real"), { eventName: "webhook", outcome: "rejected", reason: "r", flag: true, resolved: false, receivedAt: new Date() });
    await batch.commit();
    const { alertAdmins } = await import("@/lib/server/mail");
    assert.deepEqual(await alertAdmins(), { items: 1, recipients: 1, enqueued: true });
    assert.ok((await read("billing_events/real"))?.alertedAt);
    assert.equal((await read("billing_events/noise0"))?.alertedAt, undefined);
  });
});
