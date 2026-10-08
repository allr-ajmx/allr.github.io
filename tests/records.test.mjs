/**
 * The decoders: every field survives a round trip (the bug that bit twice was
 * a field silently dropped between the database and the pages), older shapes
 * decode, and nothing decodes to `undefined`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { billingFromDoc, enforcementFromDoc, promoFromDoc } from "../src/lib/billing/records.ts";

const hasUndefined = (v) => v === undefined || (v && typeof v === "object" && Object.values(v).some(hasUndefined));

describe("billingFromDoc", () => {
  const full = {
    status: "active", planCurrency: "INR", subscriptionId: "sub_1", customerId: "cust_1",
    currentPeriodEnd: "2026-11-04T00:00:00.000Z", providerStatus: "active", statusSince: "2026-10-04T00:00:00.000Z",
    cancelAtPeriodEnd: true, paidCount: 3, plan: "workspace",
    currentPeriodStart: "2026-10-04T00:00:00.000Z",
    upcoming: {
      subscriptionId: "sub_2", plan: "workspace_ai", kind: "upgrade", status: "authenticated",
      startsAt: "2026-11-04T00:00:00.000Z", chargeMinor: 800, creditUsd: 8, creditGranted: true, oldCancelled: false,
    },
    creditUsd: 5,
    bill: { currency: "INR", subtotalMinor: 145_200, taxMinor: 26_100, taxRate: 0.18, totalMinor: 171_300, fxRate: 96.78 },
    updatedAt: "2026-10-04T00:00:00.000Z",
  };
  it("every field survives (regression: cancelAtPeriodEnd, paidCount)", () => {
    assert.deepEqual(billingFromDoc(full), full);
  });
  it("a Firestore Timestamp becomes ISO", () => {
    const at = new Date("2026-10-04T00:00:00Z");
    assert.equal(billingFromDoc({ ...full, updatedAt: { toDate: () => at } }).updatedAt, at.toISOString());
  });
  it("older shapes decode with safe defaults and no undefined", () => {
    const b = billingFromDoc({ status: "active", subscriptionId: "sub_1" });
    assert.equal(b.cancelAtPeriodEnd, false);
    assert.equal(b.paidCount, null);
    assert.equal(b.planCurrency, "USD");
    assert.equal(b.plan, "workspace_ai"); // everything before two plans was Workspace + AI
    assert.equal(b.upcoming, null);
    assert.equal(b.creditUsd, 0); // before credit joined the workspace subscription
    assert.equal(b.bill, null);
    assert.equal(hasUndefined(b), false);
  });
  it("junk is refused or normalised", () => {
    assert.equal(billingFromDoc(null), null);
    assert.equal(billingFromDoc({ status: "active" }), null);
    assert.equal(billingFromDoc({ status: "weird", subscriptionId: "s" }).status, "pending");
  });
});

describe("promo and enforcement", () => {
  it("decode fully, or not at all", () => {
    assert.deepEqual(promoFromDoc({ code: "X", redeemedAt: "a", endsAt: "b", creditUsd: 5 }), { code: "X", redeemedAt: "a", endsAt: "b", creditUsd: 5 });
    assert.equal(promoFromDoc({ code: "X" }), null);
    assert.deepEqual(enforcementFromDoc({ status: "suspended", reason: "payment", suspendedAt: "t" }),
      { status: "suspended", reason: "payment", suspendedAt: "t", removeAfter: null });
    assert.equal(enforcementFromDoc({ status: "active" }), null);
  });
});
