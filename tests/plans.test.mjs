/** Plans and proration: the standard upgrade-now / downgrade-at-renewal arithmetic. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLANS, changeKind, prorate } from "../src/lib/billing/plans.ts";

const start = new Date("2026-10-01T00:00:00Z");
const end = new Date("2026-10-31T00:00:00Z"); // 30 days

describe("the catalog", () => {
  it("workspace + AI is workspace + the AI part, in both currencies", () => {
    assert.equal(PLANS.workspace.price.USD + 20_00, PLANS.workspace_ai.price.USD);
    assert.equal(PLANS.workspace.price.INR + 1_799_00, PLANS.workspace_ai.price.INR);
    assert.equal(PLANS.workspace.aiUsd, 0);
    assert.equal(PLANS.workspace_ai.aiUsd, 20);
  });
  it("direction", () => {
    assert.equal(changeKind("workspace", "workspace_ai"), "upgrade");
    assert.equal(changeKind("workspace_ai", "workspace"), "downgrade");
    assert.equal(changeKind("workspace", "workspace"), null);
  });
});

describe("prorate", () => {
  it("12 of 30 days left: pay 12/30 of the difference, get 12/30 of the allowance", () => {
    const p = prorate("workspace", "workspace_ai", "USD", start, end, new Date("2026-10-19T00:00:00Z"));
    assert.equal(p.chargeMinor, 8_00);
    assert.equal(p.creditUsd, 8);
    const inr = prorate("workspace", "workspace_ai", "INR", start, end, new Date("2026-10-19T00:00:00Z"));
    assert.equal(inr.chargeMinor, Math.round(1_799_00 * 12 / 30));
  });
  it("on the first day it's the whole difference; at the end, nothing", () => {
    assert.equal(prorate("workspace", "workspace_ai", "USD", start, end, start).chargeMinor, 20_00);
    assert.deepEqual(prorate("workspace", "workspace_ai", "USD", start, end, end), { fraction: 0, chargeMinor: 0, creditUsd: 0 });
  });
  it("a share too small to charge grants nothing either", () => {
    const p = prorate("workspace", "workspace_ai", "USD", start, end, new Date(end.getTime() - 60 * 60_000));
    assert.equal(p.chargeMinor, 0);
    assert.equal(p.creditUsd, 0);
  });
  it("downgrades are never charged or credited now", () => {
    assert.deepEqual(prorate("workspace_ai", "workspace", "USD", start, end, new Date("2026-10-10T00:00:00Z")).chargeMinor, 0);
  });
});
