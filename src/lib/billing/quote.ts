/**
 * What a payment costs, pure: the ONE place a dollar price becomes the
 * amount Razorpay charges.
 *
 * Prices are listed in USD. Razorpay won't charge an Indian customer in USD,
 * so India pays in INR at the day's rate (the caller supplies it, locked for
 * the life of a subscription); everyone else pays USD, and Razorpay's
 * Dynamic Currency Conversion offers card holders their own currency on the
 * payment form. Razorpay never adds tax itself — the amount we send is the
 * amount charged — so GST is added here and shown before payment.
 */

import { formatMoney } from "./history.ts";
import { planCurrencyFor, type PlanCurrency } from "./model.ts";

export type QuoteLine = { label: string; usd: number };

export type Quote = {
  currency: PlanCurrency;
  /** INR per USD used for this quote; 1 for USD. */
  fxRate: number;
  lines: { label: string; usd: number; minor: number }[];
  subtotalUsd: number;
  subtotalMinor: number;
  /** 0.18 for 18%. */
  taxRate: number;
  taxMinor: number;
  totalMinor: number;
};

export type GstRates = {
  /** Customers in India. */
  domestic: number;
  /** Customers abroad (0 with an LUT on file — export of services). */
  export: number;
};

export const DEFAULT_GST: GstRates = { domestic: 0.18, export: 0.18 };

/** "0.18" / "18" / "18%" → 0.18; anything unreadable → the fallback. */
export function parseRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw.trim().replace(/%$/, ""));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n > 1 ? n / 100 : n;
}

export function quote(lines: QuoteLine[], country: string, usdInr: number, gst: GstRates = DEFAULT_GST): Quote {
  const currency = planCurrencyFor(country);
  const fxRate = currency === "INR" ? usdInr : 1;
  if (!(fxRate > 0)) throw new Error("quote: no exchange rate");
  // Whole rupees / cents per line, so the lines add up to the subtotal shown.
  const toMinor = (usd: number) =>
    currency === "INR" ? Math.round(usd * fxRate) * 100 : Math.round(usd * 100);
  const priced = lines.filter((l) => l.usd > 0).map((l) => ({ ...l, minor: toMinor(l.usd) }));
  const subtotalMinor = priced.reduce((s, l) => s + l.minor, 0);
  const taxRate = currency === "INR" ? gst.domestic : gst.export;
  // INR tax to the whole rupee, USD to the cent.
  const unit = currency === "INR" ? 100 : 1;
  const taxMinor = Math.round((subtotalMinor * taxRate) / unit) * unit;
  return {
    currency,
    fxRate,
    lines: priced,
    subtotalUsd: priced.reduce((s, l) => s + l.usd, 0),
    subtotalMinor,
    taxRate,
    taxMinor,
    totalMinor: subtotalMinor + taxMinor,
  };
}

/** ₹1,548 / $17.70 — the same formatting as payment history. */
export const money = (minor: number, currency: PlanCurrency) => formatMoney(minor, currency);

/** "18% GST" for the bill. */
export const taxLabel = (q: Pick<Quote, "taxRate">) => `${Math.round(q.taxRate * 1000) / 10}% GST`;

/** The one-line bill for Razorpay's description and the confirmation copy. */
export function describeQuote(q: Quote): string {
  const items = q.lines.map((l) => `${l.label} $${l.usd}`).join(" + ");
  if (!q.taxMinor) return `${items} · ${money(q.totalMinor, q.currency)}`;
  return `${items} · ${money(q.subtotalMinor, q.currency)} + ${taxLabel(q)} ${money(q.taxMinor, q.currency)} = ${money(q.totalMinor, q.currency)}`;
}
