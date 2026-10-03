/** Promo codes: every refusal, the one-per-email rule, and the month itself. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCode, promoActive, promoFor, redeemVerdict } from "../src/lib/billing/promo.ts";

const NOW = new Date("2026-10-03T12:00:00Z");
const code = (x = {}) => ({ code: "LAUNCH", active: true, maxUses: 10, uses: 0, expiresAt: null, days: 30, creditUsd: 5, ...x });
const fresh = { code: code(), alreadyRedeemed: false, hasWorkspace: false, billingStatus: null };
const reason = (x) => redeemVerdict({ ...fresh, ...x }, NOW);

describe("normalizeCode", () => {
  it("is case-insensitive and trims", () => assert.equal(normalizeCode("  launch-2026 "), "LAUNCH-2026"));
  it("refuses junk, too short, too long, edge dashes", () => {
    for (const bad of ["", "ab", "-ABC", "ABC-", "A B C", "x".repeat(33), "AB/CD", 42, null]) {
      assert.equal(normalizeCode(bad), null, String(bad));
    }
  });
});

describe("redeemVerdict", () => {
  it("a fresh account with a live code may redeem", () => assert.deepEqual(reason({}), { ok: true }));
  it("an abandoned checkout (pending) or ended billing doesn't block", () => {
    assert.equal(reason({ billingStatus: "pending" }).ok, true);
    assert.equal(reason({ billingStatus: "ended" }).ok, true);
  });
  it("refuses: unknown, switched off, expired, used up", () => {
    assert.equal(reason({ code: null }).reason, "unknown");
    assert.equal(reason({ code: code({ active: false }) }).reason, "inactive");
    assert.equal(reason({ code: code({ expiresAt: "2026-10-03T11:59:59Z" }) }).reason, "expired");
    assert.equal(reason({ code: code({ uses: 10 }) }).reason, "used-up");
  });
  it("one promo per email, ever", () => assert.equal(reason({ alreadyRedeemed: true }).reason, "already"));
  it("not for someone with a workspace or a live subscription", () => {
    assert.equal(reason({ hasWorkspace: true }).reason, "has-workspace");
    assert.equal(reason({ billingStatus: "active" }).reason, "subscribed");
    assert.equal(reason({ billingStatus: "pastDue" }).reason, "subscribed");
  });
});

describe("the free month", () => {
  it("runs the code's days from redemption, with the code's credit", () => {
    const p = promoFor(code(), NOW);
    assert.deepEqual(p, { code: "LAUNCH", redeemedAt: NOW.toISOString(), endsAt: "2026-11-02T12:00:00.000Z", creditUsd: 5 });
    assert.equal(promoActive(p, NOW), true);
    assert.equal(promoActive(p, new Date("2026-11-02T12:00:00Z")), false);
    assert.equal(promoActive(null, NOW), false);
  });
});
