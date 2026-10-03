/** One-off payment rules (subscription rules are tested in core.test.mjs). */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { creditToRevoke, isOrderPayment } from "../src/lib/billing/reconcile.ts";




describe("creditToRevoke", () => {
  it("full refund takes back the pack; partial takes back its share", () => {
    assert.equal(creditToRevoke(9.2, 89900, 89900), 9.2);
    assert.equal(creditToRevoke(9.2, 89900, 44950), 4.6);
    assert.equal(creditToRevoke(9.2, 89900, 999999), 9.2);
    assert.equal(creditToRevoke(9.2, 0, 100), 0);
  });
});

describe("isOrderPayment", () => {
  it("one-off order payments only", () => {
    assert.equal(isOrderPayment({ order_id: "order_1" }), true);
    assert.equal(isOrderPayment({ order_id: "order_1", invoice_id: "inv_1" }), false);
    assert.equal(isOrderPayment({}), false);
  });
});

