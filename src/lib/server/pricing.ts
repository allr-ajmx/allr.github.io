import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ApiError } from "./errors";
import { shipLog } from "./logship";
import { createPlan } from "./razorpay";
import { DEFAULT_GST, parseRate, quote, type GstRates, type Quote, type QuoteLine } from "@/lib/billing/quote";
import type { PlanCurrency } from "@/lib/billing/model";

/**
 * The impure half of pricing: the day's USD→INR rate, the GST rates from
 * env, and a Razorpay plan for an exact monthly amount.
 */

const FX_DOC = () => adminDb().collection("billing_fx").doc("USD-INR");
const PLANS = "billing_plans";
/** A cached rate older than this is not used to charge anyone. */
const FX_MAX_AGE_MS = 3 * 86_400_000;
const FX_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR";

export function gstRates(): GstRates {
  return {
    domestic: parseRate(process.env.ALLR_GST_RATE_IN, DEFAULT_GST.domestic),
    export: parseRate(process.env.ALLR_GST_RATE_EXPORT, DEFAULT_GST.export),
  };
}

const today = (now: Date) => now.toISOString().slice(0, 10);

/**
 * INR per USD: today's ECB reference rate (Frankfurter), fetched at most
 * once a day and cached. If the fetch fails, a cached rate up to three days
 * old stands in; beyond that checkout refuses rather than guess.
 */
export async function usdInrRate(now = new Date()): Promise<number> {
  const cached = (await FX_DOC().get()).data() as { rate?: number; day?: string; fetchedAt?: string } | undefined;
  if (cached?.rate && cached.day === today(now)) return cached.rate;
  try {
    const res = await fetch(FX_URL, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rate = Number(((await res.json()) as { rates?: { INR?: unknown } }).rates?.INR);
    if (!(rate > 0)) throw new Error("no INR rate in the answer");
    await FX_DOC().set({ rate, day: today(now), fetchedAt: now.toISOString(), source: FX_URL });
    return rate;
  } catch (e) {
    const age = cached?.fetchedAt ? now.getTime() - Date.parse(cached.fetchedAt) : Infinity;
    if (cached?.rate && age <= FX_MAX_AGE_MS) {
      shipLog("billing", "exchange rate fetch failed; using cached rate", { error: String(e), day: cached.day }, "warn");
      return cached.rate;
    }
    shipLog("billing", "exchange rate unavailable", { error: String(e) }, "error");
    throw new ApiError(503, "pricing-unavailable", "Pricing is unavailable right now — try again in a few minutes.");
  }
}

/** The bill for these dollar lines, for this person's country. */
export async function priceFor(lines: QuoteLine[], country: string): Promise<Quote> {
  const inIndia = country?.trim().toUpperCase() === "IN";
  return quote(lines, country, inIndia ? await usdInrRate() : 1, gstRates());
}

/**
 * A Razorpay monthly plan charging exactly `amountMinor`. One per
 * (currency, amount): two people with the same bill share it.
 */
export async function planForAmount(amountMinor: number, currency: PlanCurrency, name: string): Promise<string> {
  const ref = adminDb().collection(PLANS).doc(`${currency}:${amountMinor}`);
  const known = (await ref.get()).data()?.planId;
  if (typeof known === "string" && known) return known;
  const plan = await createPlan(amountMinor, currency, name, { kind: "workspace", amount_minor: String(amountMinor) });
  // Two checkouts racing make two identical plans; either works, the first stays.
  await adminDb().runTransaction(async (tx) => {
    const now = await tx.get(ref);
    if (!now.data()?.planId) tx.set(ref, { planId: plan.id, currency, amountMinor, name, createdAt: FieldValue.serverTimestamp() });
  });
  return ((await ref.get()).data()?.planId as string) ?? plan.id;
}
