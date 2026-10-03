import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { PetalShape } from "@/components/ui/PetalShape";
import { PRICING } from "@/lib/brand";
import { GRACE_DAYS } from "@/lib/billing/model";
import { PLANS, PLAN_INTERVAL } from "@/lib/billing/plans";
import { TOPUP_PACKS } from "@/lib/billing/credits";
import { REMOVE_AFTER_DAYS } from "@/lib/billing/lifecycle";

/**
 * /pricing. Every amount and every day count is read from the billing
 * constants checkout and the lifecycle sweep use, so this page cannot promise
 * something the system doesn't do.
 */

const money = (usd: number) => `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
const AI_USD = PLANS.workspace_ai.aiUsd;
const PETALS = ["#74926b", "#f7c14c", "#e6981a", "#34905e"];

const HOW = [
  {
    title: `${money(AI_USD)} every month`,
    body: "Comes with Workspace + AI and renews with each payment. What’s unused when the month ends doesn’t carry over.",
  },
  {
    title: "Bonus credit",
    body: "Credit we grant you now and then. Each grant shows its own use-by date in your account.",
  },
  {
    title: "Credit packs",
    body: "Bought when you want more. They never expire, and they’re used last.",
  },
];

const FAQ = [
  {
    q: "Are the apps free?",
    a: "Yes. The desktop and phone apps are free to download and stay free. The plan is for the workspace they connect to.",
  },
  {
    q: "Which plan should I pick?",
    a: `If you already pay for an AI provider, Workspace (${PLANS.workspace.display.USD} a ${PLAN_INTERVAL}) lets you use your own key. Otherwise Workspace + AI (${PLANS.workspace_ai.display.USD} a ${PLAN_INTERVAL}) includes ${money(AI_USD)} of AI credit every month, so there's nothing else to set up.`,
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrading takes effect straight away: you pay the difference for the rest of your billing month and get the same share of AI credit right away; your billing date doesn't change. Switching to Workspace takes effect at your next billing date, and your AI credit lasts until then.",
  },
  {
    q: "Which currency am I charged in?",
    a: `Accounts in India pay in rupees (${PLANS.workspace.display.INR} or ${PLANS.workspace_ai.display.INR} a ${PLAN_INTERVAL}); everywhere else pays in US dollars. It follows the country on your account.`,
  },
  {
    q: "How do I pay?",
    a: "Through Razorpay, by card — and by UPI in India. The plan renews every month until you cancel.",
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
    a: `On Workspace + AI, the ${money(AI_USD)} included each month is for that month. Credit packs never expire and stay with your account.`,
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
          {(["workspace", "workspace_ai"] as const).map((key, i) => {
            const plan = PLANS[key];
            const copy = PRICING.plans[key];
            const featured = key === "workspace_ai";
            return (
              <Reveal key={key} delay={i * 0.05}>
                <div
                  className={`relative h-full rounded-card border bg-card p-8 ${featured ? "border-green-line shadow-lift" : "border-line shadow-soft"}`}
                >
                  {featured ? (
                    <span className="absolute -top-3 left-8 rounded-chip border border-green-line bg-green-tint px-2.5 py-0.5 text-[.75rem] font-bold tracking-[0.04em] text-green-deep uppercase">
                      {PRICING.recommended}
                    </span>
                  ) : null}
                  <p className="mb-1 text-[.8rem] font-bold tracking-[0.04em] text-ink-soft uppercase">{plan.name}</p>
                  <p className="mb-1 flex items-baseline gap-1.5">
                    <span className="text-[2.6rem] leading-none font-extrabold text-ink">{plan.display.USD}</span>
                    <span className="text-[1.05rem] font-semibold text-ink-soft">/ {PLAN_INTERVAL}</span>
                  </p>
                  <p className="mb-2 text-[.95rem] text-ink-soft">
                    {plan.display.INR} a {PLAN_INTERVAL} in India
                  </p>
                  <p className="mb-5 text-[.98rem] text-ink">{copy.tagline}</p>
                  <ul className="mb-7 flex flex-col gap-2.5">
                    {copy.includes.map((line) => (
                      <li key={line} className="flex gap-2.5 text-[1rem] text-ink">
                        <Check />
                        <span>
                          {line === "AI credit every month, included"
                            ? `${money(plan.aiUsd)} of AI credit every ${PLAN_INTERVAL}, included`
                            : line}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button href="/login/" size="lg" variant={featured ? "green" : "ghost"} className="w-full">
                    {PRICING.cta}
                  </Button>
                </div>
              </Reveal>
            );
          })}
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
                <p className="text-[.95rem] font-bold text-ink">{pack.display.USD}</p>
                <p className="text-[.85rem] text-ink-soft">{pack.display.INR} in India</p>
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
                  {i === 0 ? "Used first" : i === 1 ? "Then" : "Used last"}
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
