/** Promo codes through the real transaction: caps, one per email, the build. */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { admin, caller, read, resetDb, seedUser } from "./harness.ts";

beforeEach(resetDb);

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
