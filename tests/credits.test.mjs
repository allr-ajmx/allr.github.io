/**
 * The credit ledger. Money math: every boundary is a test — the month seam,
 * the bucket order, expiry, live-vs-snapshot usage, and changes that must
 * never re-attribute spend that already happened.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INCLUDED_USD,
  appliedLimit,
  applyMonthlyGrant,
  applyTopup,
  applyUsage,
  hasExpiredGrant,
  initialLedger,
  packById,
  pools,
  queueChange,
  remaining,
  settle,
  spentThisCycle,
  targetOf,
  TOPUP_PACKS,
  forNewKey,
} from "../src/lib/billing/credits.ts";

const NOW = new Date("2026-10-02T12:00:00Z");
const LATER = new Date("2026-10-20T12:00:00Z");
const grant = (id, usd, expiresAt = null) => ({ type: "grant", grant: { id, usd, expiresAt } });

describe("basics", () => {
  it("starts with the included grant as the limit", () => {
    const l = initialLedger();
    assert.equal(targetOf(l), INCLUDED_USD);
    assert.equal(remaining(l, NOW).includedUsd, 20);
  });

  it("spend draws included first, then packs", () => {
    let l = applyTopup(initialLedger(), 25);
    l = applyUsage(l, 12, "t1");
    assert.deepEqual(
      [remaining(l, NOW).includedUsd, remaining(l, NOW).topupUsd],
      [8, 25],
    );
    l = applyUsage(l, 28, "t2");
    assert.deepEqual(
      [remaining(l, NOW).includedUsd, remaining(l, NOW).topupUsd],
      [0, 17],
    );
  });

  it("a pack raises balance and limit immediately", () => {
    const l = applyTopup(initialLedger(), 10);
    assert.equal(l.targetLimitUsd, 30);
  });

  it("usage never goes backwards, through snapshots or settlement", () => {
    let l = applyUsage(initialLedger(), 9, "t1");
    l = applyUsage(l, 7, "t2");
    assert.equal(l.usageUsd, 9);
    assert.equal(settle(l, 3, NOW).usageUsd, 9);
  });

  it("overspend shows zero, not negative", () => {
    const l = applyUsage(initialLedger(), 999, "t");
    const r = remaining(l, NOW);
    assert.deepEqual([r.includedUsd, r.grantsUsd, r.topupUsd], [0, 0, 0]);
    assert.equal(spentThisCycle(l), 999);
  });

  it("pack lookup refuses unknown ids", () => {
    assert.equal(packById("s")?.creditUsd, 9.2);
    assert.equal(packById("xxl"), null);
  });

  it("packs: $10/$25/$50/$100, credit is price less fees, INR priced per pack", () => {
    assert.deepEqual(TOPUP_PACKS.map((p) => [p.id, p.priceUsd, p.creditUsd, p.price.INR]), [
      ["s", 10, 9.2, 899_00],
      ["m", 25, 23, 2_199_00],
      ["l", 50, 46, 4_299_00],
      ["xl", 100, 92, 8_499_00],
    ]);
    for (const p of TOPUP_PACKS) {
      assert.equal(p.price.USD, p.priceUsd * 100);
      assert.ok(p.creditUsd < p.priceUsd);
    }
  });
});

describe("monthly settlement against live usage", () => {
  it("a charge only marks; nothing moves until settlement", () => {
    const l = applyMonthlyGrant(applyTopup(initialLedger(), 25));
    assert.equal(l.grantsPending, 1);
    assert.equal(l.targetLimitUsd, 45);
  });

  it("uses LIVE usage, not the stale snapshot", () => {
    let l = applyUsage(applyTopup(initialLedger(), 25), 5, "t");
    l = settle(applyMonthlyGrant(l), 18, NOW);
    assert.equal(l.cycleStartUsageUsd, 18);
    assert.equal(l.topupBalanceUsd, 25);
    assert.equal(l.includedLeftUsd, 20);
    assert.equal(targetOf(l), 18 + 20 + 25);
  });

  it("after dipping into packs, only what's left carries", () => {
    const l = settle(applyMonthlyGrant(applyTopup(initialLedger(), 25)), 33, NOW);
    assert.equal(l.topupBalanceUsd, 12);
    assert.equal(targetOf(l), 33 + 20 + 12);
  });

  it("two pending charges collapse — never a double grant", () => {
    const l = settle(applyMonthlyGrant(applyMonthlyGrant(initialLedger())), 0, NOW);
    assert.equal(targetOf(l), INCLUDED_USD);
  });

  it("settle without anything pending only advances usage", () => {
    const l = settle(applyTopup(initialLedger(), 10), 7, NOW);
    assert.equal(l.usageUsd, 7);
    assert.equal(targetOf(l), 30);
  });
});

describe("admin grants with expiry", () => {
  it("a grant applies at settlement, between included and packs", () => {
    let l = applyTopup(initialLedger(), 10);
    l = settle(queueChange(l, grant("g1", 15, "2026-10-31T00:00:00Z")), 0, NOW);
    assert.equal(targetOf(l), 20 + 15 + 10);
    l = applyUsage(l, 27, "t"); // 20 included + 7 of the grant
    const r = remaining(l, NOW);
    assert.deepEqual([r.includedUsd, r.grantsUsd, r.topupUsd], [0, 8, 10]);
  });

  it("the remaining view previews queued grants before they settle", () => {
    const l = queueChange(initialLedger(), grant("g1", 15));
    assert.equal(remaining(l, NOW).grantsUsd, 15);
  });

  it("soonest-expiring grant is drawn first", () => {
    let l = settle(queueChange(queueChange(initialLedger(),
      grant("late", 10, "2026-12-01T00:00:00Z")),
      grant("soon", 10, "2026-10-10T00:00:00Z")), 0, NOW);
    l = applyUsage(l, 24, "t"); // 20 included + 4 from 'soon'
    const p = pools(l);
    assert.equal(p.grants.find((g) => g.id === "soon").usd, 6);
    assert.equal(p.grants.find((g) => g.id === "late").usd, 10);
  });

  it("at expiry the unspent part vanishes; spent stays spent", () => {
    let l = settle(queueChange(applyTopup(initialLedger(), 5), grant("g1", 15, "2026-10-10T00:00:00Z")), 0, NOW);
    assert.equal(hasExpiredGrant(l, NOW), false);
    assert.equal(hasExpiredGrant(l, LATER), true);
    // 26 spent: 20 included + 6 of the grant. At expiry 9 of the grant vanish.
    l = settle(l, 26, LATER);
    assert.deepEqual(l.grants, []);
    assert.equal(l.topupBalanceUsd, 5);
    assert.equal(l.includedLeftUsd, 0);
    assert.equal(targetOf(l), 26 + 0 + 5);
  });

  it("a new grant never re-attributes spend that already happened", () => {
    // 25 spent before the grant: 20 included + 5 of the pack. A sooner-
    // expiring grant added afterwards must not "absorb" that past spend.
    let l = applyUsage(applyTopup(initialLedger(), 10), 25, "t");
    l = settle(queueChange(l, grant("g1", 15, "2026-10-05T00:00:00Z")), 25, NOW);
    assert.equal(l.topupBalanceUsd, 5);
    assert.equal(l.grants[0].usd, 15);
  });

  it("revoking removes what's left of a grant", () => {
    let l = settle(queueChange(initialLedger(), grant("g1", 15)), 0, NOW);
    l = settle(queueChange(l, { type: "revoke", id: "g1" }), 0, NOW);
    assert.equal(targetOf(l), 20);
  });
});

describe("per-customer included amount", () => {
  it("raising helps this month at once and persists into the next", () => {
    let l = settle(queueChange(initialLedger(), { type: "set_included", usd: 50 }), 0, NOW);
    assert.equal(targetOf(l), 50);
    l = settle(applyMonthlyGrant(l), 30, NOW);
    assert.equal(targetOf(l), 30 + 50);
  });
  it("lowering below spend: the applied limit never drops under live usage", () => {
    let l = applyUsage(initialLedger(), 18, "t");
    l = settle(queueChange(l, { type: "set_included", usd: 5 }), 18, NOW);
    assert.equal(l.includedLeftUsd, 0);
    assert.equal(appliedLimit(l, 18), 18);
  });
  it("old ledgers without the newer fields behave as $20, nothing pending", () => {
    const legacy = { includedUsd: 20, cycleStartUsageUsd: 0, topupBalanceUsd: 0, targetLimitUsd: 20, usageUsd: 6, usageSyncedAt: null };
    assert.equal(remaining(legacy, NOW).includedUsd, 14);
    assert.equal(targetOf(legacy), 20);
    assert.equal(targetOf(settle(legacy, 6, NOW)), 6 + 14);
  });
});

describe("the workspace is removed, a new one (new key) may follow", () => {
  it("packs and live grants carry as what's left; included goes; usage restarts at zero", () => {
    let l = applyTopup(initialLedger(), 10);
    l = settle(queueChange(l, grant("g1", 15, "2026-12-01T00:00:00Z")), 0, NOW);
    l = applyUsage(l, 27, "t"); // 20 included + 7 of the grant
    const n = forNewKey(l, NOW);
    assert.deepEqual([n.usageUsd, n.cycleStartUsageUsd, n.includedLeftUsd, n.topupBalanceUsd], [0, 0, 0, 10]);
    assert.equal(n.grants[0].usd, 8);
    assert.equal(targetOf(n), 18); // the new key's limit: exactly what is left
  });
  it("expired grants don't survive, and a new subscription's charge restores included", () => {
    let l = settle(queueChange(initialLedger(), grant("old", 5, "2026-10-01T00:00:00Z")), 0, new Date("2026-09-20T00:00:00Z"));
    const n = forNewKey(l, NOW);
    assert.deepEqual(n.grants, []);
    assert.equal(targetOf(settle(applyMonthlyGrant(n), 0, NOW)), INCLUDED_USD);
  });
});

describe("a refunded credit pack", () => {
  it("takes back what's left of it at settlement, against live usage", () => {
    let l = applyTopup(initialLedger(), 9.2);
    l = settle(queueChange(l, { type: "refund_topup", usd: 9.2 }), 0, NOW);
    assert.equal(l.topupBalanceUsd, 0);
    assert.equal(targetOf(l), 20);
  });
  it("never goes below zero when the pack was already spent", () => {
    let l = applyUsage(applyTopup(initialLedger(), 10), 27, "t"); // 20 included + 7 of the pack
    l = settle(queueChange(l, { type: "refund_topup", usd: 10 }), 27, NOW);
    assert.equal(l.topupBalanceUsd, 0);
    assert.equal(targetOf(l), 27); // the key holds at what's already spent
  });
  it("the preview shows it before settlement", () => {
    const l = queueChange(applyTopup(initialLedger(), 10), { type: "refund_topup", usd: 10 });
    assert.equal(remaining(l, NOW).topupUsd, 0);
  });
});
