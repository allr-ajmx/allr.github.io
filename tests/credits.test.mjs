/**
 * The credit ledger. Money math, so the boundaries are the tests: the month
 * boundary, the included/top-up seam, and snapshots arriving late.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INCLUDED_USD,
  applyMonthlyGrant,
  applyTopup,
  applyUsage,
  initialLedger,
  packById,
  remaining,
  spentThisCycle,
} from "../src/lib/billing/credits.ts";

describe("credit ledger", () => {
  it("starts with the included grant as the limit", () => {
    const l = initialLedger();
    assert.equal(l.targetLimitUsd, INCLUDED_USD);
    assert.deepEqual(remaining(l), { includedUsd: 20, topupUsd: 0 });
  });

  it("spend draws included first, then top-ups", () => {
    let l = applyTopup(initialLedger(), 25);
    l = applyUsage(l, 12, "2026-01-10T00:00:00Z");
    assert.deepEqual(remaining(l), { includedUsd: 8, topupUsd: 25 });
    l = applyUsage(l, 28, "2026-01-20T00:00:00Z");
    assert.deepEqual(remaining(l), { includedUsd: 0, topupUsd: 17 });
  });

  it("a top-up raises both balance and the key's target limit", () => {
    const l = applyTopup(initialLedger(), 10);
    assert.equal(l.topupBalanceUsd, 10);
    assert.equal(l.targetLimitUsd, 30);
  });

  it("monthly grant: unspent included expires, top-ups carry", () => {
    let l = applyTopup(initialLedger(), 25); // limit 45
    l = applyUsage(l, 5, "t"); // spent 5 of included
    l = applyMonthlyGrant(l);
    // 15 included lost; 25 top-up carried; new limit = 5 + 20 + 25
    assert.equal(l.cycleStartUsageUsd, 5);
    assert.equal(l.topupBalanceUsd, 25);
    assert.equal(l.targetLimitUsd, 50);
    assert.deepEqual(remaining(l), { includedUsd: 20, topupUsd: 25 });
  });

  it("monthly grant after dipping into top-ups carries only what's left", () => {
    let l = applyTopup(initialLedger(), 25);
    l = applyUsage(l, 33, "t"); // 20 included + 13 of the pack
    l = applyMonthlyGrant(l);
    assert.equal(l.topupBalanceUsd, 12);
    assert.equal(l.targetLimitUsd, 33 + 20 + 12);
  });

  it("two grants with no spend do not stack included credit", () => {
    let l = applyMonthlyGrant(applyMonthlyGrant(initialLedger()));
    assert.equal(l.targetLimitUsd, INCLUDED_USD);
    assert.deepEqual(remaining(l), { includedUsd: 20, topupUsd: 0 });
  });

  it("usage never goes backwards", () => {
    let l = applyUsage(initialLedger(), 9, "t1");
    l = applyUsage(l, 7, "t2");
    assert.equal(l.usageUsd, 9);
    assert.equal(l.usageSyncedAt, "t2");
  });

  it("overspend beyond every bucket shows zero, not negative", () => {
    let l = applyUsage(initialLedger(), 999, "t");
    assert.deepEqual(remaining(l), { includedUsd: 0, topupUsd: 0 });
    assert.equal(spentThisCycle(l), 999);
  });

  it("pack lookup refuses unknown ids", () => {
    assert.equal(packById("s")?.creditUsd, 10);
    assert.equal(packById("xl"), null);
    assert.equal(packById(null), null);
  });
});

import { setIncluded } from "../src/lib/billing/credits.ts";

describe("per-customer included override", () => {
  it("raising the grant mid-cycle helps immediately and persists monthly", () => {
    let l = setIncluded(initialLedger(), 50);
    assert.equal(l.targetLimitUsd, 50);
    assert.deepEqual(remaining(l), { includedUsd: 50, topupUsd: 0 });
    l = applyUsage(l, 30, "t");
    l = applyMonthlyGrant(l);
    assert.equal(l.targetLimitUsd, 30 + 50);
  });
  it("lowering the grant never claws back below what is spent", () => {
    let l = applyUsage(initialLedger(), 18, "t");
    l = setIncluded(l, 5);
    assert.ok(l.targetLimitUsd >= 18);
    assert.deepEqual(remaining(l), { includedUsd: 0, topupUsd: 0 });
  });
  it("old ledgers without the field behave as $20", () => {
    const legacy = { cycleStartUsageUsd: 0, topupBalanceUsd: 0, targetLimitUsd: 20, usageUsd: 6, usageSyncedAt: null };
    assert.deepEqual(remaining(legacy), { includedUsd: 14, topupUsd: 0 });
  });
});
