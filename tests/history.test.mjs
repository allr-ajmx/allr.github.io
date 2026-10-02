/** Billing history: what moved money, what's due, newest first; drafts never show. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHistory, formatMoney } from "../src/lib/billing/history.ts";

const t = (iso) => Date.parse(iso) / 1000;

describe("buildHistory", () => {
  it("merges invoices and packs newest first, skipping drafts and cancelled", () => {
    const items = buildHistory(
      [
        { id: "inv_1", status: "paid", amount: 249900, amount_paid: 249900, currency: "INR", paid_at: t("2026-09-02T10:00:00Z"),
          billing_start: t("2026-09-02T00:00:00Z"), billing_end: t("2026-10-02T00:00:00Z"), short_url: "https://rzp.io/i/x" },
        { id: "inv_2", status: "issued", amount: 249900, currency: "INR", date: t("2026-10-02T10:00:00Z") },
        { id: "inv_d", status: "draft", amount: 1, date: t("2026-10-03T00:00:00Z") },
        { id: "inv_c", status: "cancelled", amount: 1, date: t("2026-10-03T00:00:00Z") },
      ],
      [{ id: "pay_1", createdAt: "2026-09-15T00:00:00.000Z", amountMinor: 89900, currency: "INR", creditUsd: 9.2 }],
    );
    assert.deepEqual(items.map((i) => [i.id, i.status]), [["inv_2", "due"], ["pay_1", "paid"], ["inv_1", "paid"]]);
    assert.equal(items[2].description, "Workspace · 2 Sept – 2 Oct");
    assert.equal(items[2].receiptUrl, "https://rzp.io/i/x");
    assert.equal(items[1].description, "AI credit · $9.20");
  });
  it("an expired invoice is a failed charge; undated items are dropped", () => {
    const items = buildHistory([
      { id: "a", status: "expired", amount: 3000, currency: "USD", date: t("2026-09-01T00:00:00Z") },
      { id: "b", status: "paid", amount: 3000 },
    ], [{ id: "p", createdAt: null, amountMinor: 1, currency: "USD", creditUsd: 1 }]);
    assert.deepEqual(items.map((i) => [i.id, i.status]), [["a", "failed"]]);
  });
});

describe("formatMoney", () => {
  it("formats INR and USD from minor units", () => {
    assert.equal(formatMoney(249900, "INR"), "₹2,499");
    assert.equal(formatMoney(3000, "USD"), "$30");
    assert.equal(formatMoney(920, "USD"), "$9.20");
  });
});
