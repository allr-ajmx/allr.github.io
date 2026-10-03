/** The harness itself: real modules, emulator, fake Razorpay. */
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { freshRazorpay, read, resetDb, seedUser } from "./harness.ts";

describe("harness", () => {
  let rzp: ReturnType<typeof freshRazorpay>;
  before(() => { rzp = freshRazorpay(); });
  after(() => rzp.uninstall());
  beforeEach(resetDb);

  it("seeds an account and reaches the fake Razorpay through the real client", async () => {
    await seedUser("u1", "a@example.com", { ws: "alpha" });
    assert.equal((await read("users/u1"))?.workspace_username, "alpha");
    const { createOrder } = await import("@/lib/server/razorpay");
    const o = await createOrder(89900, "INR", { kind: "topup" });
    assert.equal(rzp.orders.get(o.id)?.amount, 89900);
  });
});
