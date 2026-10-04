/**
 * The credit ledger. Available credit is purchased minus usage. Monthly
 * refills and top-ups roll over; a pack's credit is its face price.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPurchased,
  appliedLimit,
  applyTopup,
  applyUsage,
  availableUsd,
  forNewKey,
  initialLedger,
  ledgerFromDoc,
  packById,
  queueChange,
  remaining,
  settle,
  targetOf,
  TOPUP_PACKS,
} from "../src/lib/billing/credits.ts";

const NOW = new Date("2026-10-02T12:00:00Z");

describe("available credit", () => {
  it("starts at zero — a workspace does not include credit", () => {
    const l = initialLedger();
    assert.equal(targetOf(l), 0);
    assert.equal(availableUsd(l), 0);
    assert.equal(remaining(l, NOW).availableUsd, 0);
  });

  it("a monthly refill and a top-up accumulate, and unused credit rolls over", () => {
    let l = addPurchased(initialLedger(), 20);
    l = applyUsage(l, 8, "t1");
    assert.equal(availableUsd(l), 12);
    l = addPurchased(l, 20);
    assert.equal(availableUsd(l), 32);
    l = applyTopup(l, 10);
    assert.equal(availableUsd(l), 42);
    assert.equal(l.purchasedUsd, 50);
  });

  it("usage never goes backwards and available never goes negative", () => {
    let l = addPurchased(initialLedger(), 20);
    l = applyUsage(l, 9, "t1");
    l = applyUsage(l, 7, "t2");
    assert.equal(l.usageUsd, 9);
    l = applyUsage(l, 999, "t3");
    assert.equal(availableUsd(l), 0);
    assert.equal(settle(l, 3, NOW).usageUsd, 999);
  });

  it("the key limit is the purchased total, never below live usage", () => {
    const l = addPurchased(initialLedger(), 20);
    assert.equal(appliedLimit(l, 0), 20);
    assert.equal(appliedLimit(l, 25), 25);
  });

  it("a removed workspace carries only what was still available", () => {
    let l = addPurchased(initialLedger(), 20);
    l = applyUsage(l, 7, "t");
    const next = forNewKey(l, NOW);
    assert.equal(next.usageUsd, 0);
    assert.equal(next.purchasedUsd, 13);
    assert.equal(availableUsd(next), 13);
  });

  it("a refund takes back unspent credit and leaves what was already used", () => {
    let l = applyTopup(initialLedger(), 10);
    l = applyUsage(l, 4, "t");
    l = settle(queueChange(l, { type: "refund_topup", usd: 10 }), l.usageUsd, NOW);
    assert.equal(l.purchasedUsd, 4);
    assert.equal(availableUsd(l), 0);
  });

  it("an older included-grant ledger loads as purchased credit", () => {
    const l = ledgerFromDoc({
      includedUsd: 20,
      cycleStartUsageUsd: 0,
      topupBalanceUsd: 0,
      targetLimitUsd: 20,
      usageUsd: 6,
      usageSyncedAt: null,
    });
    assert.equal(l.purchasedUsd, 20);
    assert.equal(availableUsd(l), 14);
  });
});

describe("packs", () => {
  it("credit is the face price", () => {
    assert.equal(packById("s")?.creditUsd, 10);
    assert.equal(packById("xxl"), null);
    assert.deepEqual(TOPUP_PACKS.map((p) => [p.id, p.priceUsd, p.creditUsd]), [
      ["s", 10, 10],
      ["m", 25, 25],
      ["l", 50, 50],
      ["xl", 100, 100],
    ]);
  });
});
