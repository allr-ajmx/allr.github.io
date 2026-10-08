import type { Quote } from "@/lib/billing/quote";
import { money, taxLabel } from "@/lib/billing/quote";

/**
 * The bill before payment: what each line is in dollars, what it comes to in
 * the currency charged, then GST and the total — the exact amount Razorpay
 * will ask for.
 */
export function Bill({ quote, per }: { quote: Quote | null; per?: string }) {
  if (!quote) return <p className="text-[.9rem] text-ink-soft">Working out your total…</p>;
  const converted = quote.currency !== "USD";
  const suffix = per ? <span className="font-normal text-ink-soft">/{per}</span> : null;
  return (
    <dl className="text-[.92rem] text-ink">
      {quote.lines.map((l) => (
        <div key={l.label} className="flex justify-between gap-4">
          <dt>
            {l.label} ${l.usd}
          </dt>
          <dd>{money(l.minor, quote.currency)}</dd>
        </div>
      ))}
      {quote.taxMinor ? (
        <div className="flex justify-between gap-4 text-ink-soft">
          <dt>{taxLabel(quote)}</dt>
          <dd>{money(quote.taxMinor, quote.currency)}</dd>
        </div>
      ) : null}
      <div className="mt-1 flex justify-between gap-4 border-t border-line-soft pt-1 font-bold">
        <dt>Total</dt>
        <dd>
          {money(quote.totalMinor, quote.currency)}
          {suffix}
        </dd>
      </div>
      <p className="mt-1 text-[.82rem] text-ink-soft">
        {converted
          ? `Charged in rupees at today’s rate, $1 = ₹${quote.fxRate.toFixed(2)}${per ? ", fixed for this subscription" : ""}.`
          : "Charged in US dollars. Cards from other countries can pay in their own currency on the payment screen."}
      </p>
    </dl>
  );
}
