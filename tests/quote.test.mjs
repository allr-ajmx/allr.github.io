/** Pricing: dollar lines → the charged currency at the day's rate, plus GST. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_GST, describeQuote, money, parseRate, quote } from "../src/lib/billing/quote.ts";

const lines = [{ label: "Workspace", usd: 10 }, { label: "AI credit", usd: 5 }];

describe("quote", () => {
  it("India: rupees at the given rate, whole rupees per line, 18% GST to the rupee", () => {
    const q = quote(lines, "IN", 96.78);
    assert.equal(q.currency, "INR");
    assert.equal(q.fxRate, 96.78);
    assert.deepEqual(q.lines.map((l) => l.minor), [968_00, 484_00]); // ₹967.8 → ₹968, ₹483.9 → ₹484
    assert.equal(q.subtotalMinor, 1_452_00);
    assert.equal(q.taxMinor, 261_00); // 18% of ₹1,452 = ₹261.36 → ₹261
    assert.equal(q.totalMinor, 1_713_00);
    assert.equal(q.subtotalUsd, 15);
  });
  it("elsewhere: US dollars, the rate is ignored, tax to the cent", () => {
    const q = quote(lines, "DE", 96.78);
    assert.equal(q.currency, "USD");
    assert.equal(q.fxRate, 1);
    assert.equal(q.subtotalMinor, 15_00);
    assert.equal(q.taxMinor, 2_70);
    assert.equal(q.totalMinor, 17_70);
  });
  it("export GST is its own rate (0 with an LUT)", () => {
    const q = quote(lines, "US", 1, { domestic: 0.18, export: 0 });
    assert.equal(q.taxMinor, 0);
    assert.equal(q.totalMinor, 15_00);
    assert.equal(quote(lines, "IN", 90, { domestic: 0.18, export: 0 }).taxRate, 0.18);
  });
  it("a zero line (credit off) is left off the bill", () => {
    const q = quote([{ label: "Workspace", usd: 10 }, { label: "AI credit", usd: 0 }], "IN", 90);
    assert.equal(q.lines.length, 1);
    assert.equal(q.totalMinor, 900_00 + 162_00);
  });
  it("refuses to price India without a rate", () => {
    assert.throws(() => quote(lines, "IN", 0));
  });
  it("defaults to 18% everywhere", () => {
    assert.deepEqual(DEFAULT_GST, { domestic: 0.18, export: 0.18 });
  });
  it("reads rates as fractions or percents", () => {
    assert.equal(parseRate("0.18", 0), 0.18);
    assert.equal(parseRate("18", 0), 0.18);
    assert.equal(parseRate("18%", 0), 0.18);
    assert.equal(parseRate("0", 0.18), 0);
    assert.equal(parseRate("", 0.18), 0.18);
    assert.equal(parseRate("junk", 0.18), 0.18);
    assert.equal(parseRate(undefined, 0.18), 0.18);
  });
  it("describes the bill in one line", () => {
    assert.equal(
      describeQuote(quote(lines, "IN", 96.78)),
      "Workspace $10 + AI credit $5 · ₹1,452 + 18% GST ₹261 = ₹1,713",
    );
    assert.equal(money(17_70, "USD"), "$17.70");
  });
});
