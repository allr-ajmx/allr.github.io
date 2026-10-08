import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { PetalShape } from "@/components/ui/PetalShape";
import { PRICING } from "@/lib/brand";
import { GRACE_DAYS } from "@/lib/billing/model";
import { CREDIT_MIN_USD, CREDIT_PRESET_USD, PLANS, PLAN_INTERVAL, WORKSPACE_USD } from "@/lib/billing/plans";
import { TOPUP_PACKS } from "@/lib/billing/credits";
import { REMOVE_AFTER_DAYS } from "@/lib/billing/lifecycle";

/**
 * /pricing. Every amount and every day count is read from the billing
 * constants checkout and the lifecycle sweep use, so this page cannot promise
 * something the system doesn't do.
 */

const money = (usd: number) => `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
const PETALS = ["#74926b", "#f7c14c", "#e6981a", "#34905e"];
const workspace = PLANS.workspace;
const workspacePrice = money(WORKSPACE_USD);

const HOW = [
  {
    title: "Your workspace",
    body: `One monthly subscription (${workspacePrice}). It does not include AI. Use your own key, or add credit.`,
  },
  {
    title: "Monthly AI credit",
    body: `Optional, chosen with the workspace and paid in the same monthly payment. Starts at ${money(CREDIT_PRESET_USD)}; any whole-dollar amount from ${money(CREDIT_MIN_USD)}. What you don’t use rolls into next month.`,
  },
  {
    title: "Top-ups",
    body: "A one-time payment added to the same balance. The price is the credit, and it stays until you use it.",
  },
];

const FAQ = [
  {
    q: "Are the apps free?",
    a: "Yes. The desktop and phone apps are free to download and stay free. The plan is for the workspace they connect to.",
  },
  {
    q: "Do I have to buy AI credit?",
    a: `No. The workspace (${workspacePrice} a ${PLAN_INTERVAL}) runs with your own AI key. Monthly credit is optional: leave it off, or add it to the same monthly payment from ${money(CREDIT_MIN_USD)} up. ${money(CREDIT_PRESET_USD)} is only the starting suggestion.`,
  },
  {
    q: "Need more credit before your next renewal?",
    a: "Buy a top-up any time from the Credits page. It adds to the same balance, and the credit you already paid for stays.",
  },
  {
    q: "Which currency am I charged in?",
    a: "Prices are in US dollars. Accounts in India pay in rupees, converted at the day’s exchange rate when you subscribe (the monthly amount then stays fixed for that subscription). Everywhere else pays in US dollars, and cards from other countries can pay in their own currency on the payment screen. You see the exact total before you pay.",
  },
  {
    q: "How do I pay?",
    a: "Through Razorpay, by card — and by UPI in India. Your plan renews every month until you cancel. 18% GST is added to every payment and shown on the bill before you pay.",
  },
  {
    q: "What happens if I cancel?",
    a: `No further charges. Your workspace stays up until the end of the period you paid for, then it pauses — nothing in it is lost. Subscribe again within ${REMOVE_AFTER_DAYS} days and it comes straight back; after that it is removed.`,
  },
  {
    q: "What if a payment fails?",
    a: `Your workspace keeps running while the payment is retried. If it still hasn’t gone through after ${GRACE_DAYS} days, the workspace pauses until it does — and an unpaid workspace is removed ${REMOVE_AFTER_DAYS} days after pausing.`,
  },
  {
    q: "What happens to unused credit?",
    a: "It stays. Next month’s refill and any top-up add to whatever you have not used.",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="mt-[3px] size-[18px] shrink-0 text-green" aria-hidden="true" fill="none">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PricingPageContent() {
  return (
    <div className="relative pt-6 pb-24">
      <section className="wrap mb-14">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <h1 className="mb-4 text-[clamp(2rem,4.4vw,3rem)] leading-[1.15]">{PRICING.title}</h1>
          <p className="text-[1.08rem] text-ink-soft">{PRICING.sub}</p>
        </Reveal>
      </section>

      <section className="wrap mb-20">
        <div className="mx-auto grid max-w-[920px] gap-5 min-[820px]:grid-cols-2">
          <Reveal>
            <div className="relative h-full rounded-card border border-line bg-card p-8 shadow-soft">
              <p className="mb-1 text-[.8rem] font-bold tracking-[0.04em] text-ink-soft uppercase">{workspace.name}</p>
              <p className="mb-1 flex items-baseline gap-1.5">
                <span className="text-[2.6rem] leading-none font-extrabold text-ink">{workspacePrice}</span>
                <span className="text-[1.05rem] font-semibold text-ink-soft">/ {PLAN_INTERVAL}</span>
              </p>
              <p className="mb-2 text-[.95rem] text-ink-soft">
                + GST · charged in rupees in India at the day’s rate
              </p>
              <p className="mb-5 text-[.98rem] text-ink">{PRICING.plans.workspace.tagline}</p>
              <ul className="mb-7 flex flex-col gap-2.5">
                {PRICING.plans.workspace.includes.map((line) => (
                  <li key={line} className="flex gap-2.5 text-[1rem] text-ink">
                    <Check />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Button href="/login/" size="lg" variant="green" className="w-full">
                {PRICING.cta}
              </Button>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="relative h-full rounded-card border border-green-line bg-card p-8 shadow-lift">
              <p className="mb-1 text-[.8rem] font-bold tracking-[0.04em] text-ink-soft uppercase">{PRICING.creditCardTitle}</p>
              <p className="mb-1 flex items-baseline gap-1.5">
                <span className="text-[2.6rem] leading-none font-extrabold text-ink">{money(CREDIT_PRESET_USD)}</span>
                <span className="text-[1.05rem] font-semibold text-ink-soft">/ {PLAN_INTERVAL}</span>
              </p>
              <p className="mb-2 text-[.95rem] text-ink-soft">
                + GST · any amount from {money(CREDIT_MIN_USD)}
              </p>
              <p className="mb-5 text-[.98rem] text-ink">{PRICING.creditCardTagline}</p>
              <ul className="mb-7 flex flex-col gap-2.5">
                {[
                  "Chosen with the workspace — one monthly payment",
                  "Unused credit rolls over in full",
                  "Top up any time if you need more",
                  "Or leave it off and use your own key",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5 text-[1rem] text-ink">
                    <Check />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Button href="/login/" size="lg" variant="ghost" className="w-full">
                {PRICING.cta}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="wrap mb-20">
        <Reveal className="mx-auto mb-8 max-w-[660px] text-center">
          <h2 className="mb-3 text-[clamp(1.6rem,3.2vw,2.2rem)]">{PRICING.creditTitle}</h2>
          <p className="text-[1.04rem] text-ink-soft">{PRICING.creditSub}</p>
        </Reveal>
        <div className="mx-auto grid max-w-[880px] grid-cols-2 gap-4 min-[820px]:grid-cols-4">
          {TOPUP_PACKS.map((pack, i) => (
            <Reveal key={pack.id} delay={i * 0.05}>
              <div className="h-full rounded-card border border-line bg-card p-5 shadow-soft">
                <PetalShape color={PETALS[i % PETALS.length]} className="mb-3 size-5" />
                <p className="text-[1.35rem] leading-tight font-extrabold text-ink">{money(pack.creditUsd)}</p>
                <p className="mb-3 text-[.88rem] text-ink-soft">of AI credit</p>
                <p className="text-[.95rem] font-bold text-ink">{money(pack.priceUsd)}</p>
                <p className="text-[.85rem] text-ink-soft">+ GST</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-center text-[.88rem] text-ink-soft">{PRICING.creditFeeNote}</p>
      </section>

      <section className="wrap mb-20">
        <Reveal className="mx-auto mb-8 max-w-[660px] text-center">
          <h2 className="text-[clamp(1.6rem,3.2vw,2.2rem)]">{PRICING.howTitle}</h2>
        </Reveal>
        <ol className="mx-auto grid max-w-[880px] gap-4 min-[820px]:grid-cols-3">
          {HOW.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.05}>
              <li className="h-full list-none rounded-card border border-line bg-card p-6 shadow-soft">
                <p className="mb-1.5 text-[.8rem] font-bold tracking-[0.04em] text-honey-deep uppercase">
                  {i === 0 ? "Required" : i === 1 ? "Optional" : "Any time"}
                </p>
                <p className="mb-2 text-[1.12rem] font-bold text-ink">{step.title}</p>
                <p className="text-[.96rem] leading-[1.7] text-ink-soft">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="wrap">
        <Reveal className="mx-auto mb-8 max-w-[660px] text-center">
          <h2 className="text-[clamp(1.6rem,3.2vw,2.2rem)]">{PRICING.faqTitle}</h2>
        </Reveal>
        <div className="mx-auto flex max-w-[720px] flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-card border border-line bg-card px-5 py-4 shadow-soft">
              <summary className="cursor-pointer list-none text-[1.02rem] font-bold text-ink marker:hidden">
                {item.q}
              </summary>
              <p className="mt-2.5 text-[.98rem] leading-[1.7] text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
