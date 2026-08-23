import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { JunkPill, OnePill } from "@/components/ui/JunkPill";
import { SectionHead } from "@/components/ui/SectionHead";
import { CTA, PRICING_LINE_ITEMS } from "@/lib/brand";

export function Pricing() {
  return (
    <section id="pricing" className="relative pt-5 pb-22">
      <div className="wrap">
        <SectionHead eyebrow="Pricing" title="One subscription. Do the math.">
          A slides tool, a doc tool, a video tool, a website builder, and an app
          builder — that stack runs $100+ a month, before you&rsquo;ve shipped
          anything. Allr replaces it with one plan.
        </SectionHead>

        <Reveal
          className="mt-2 flex flex-col items-center gap-[18px]"
          aria-hidden="true"
          delay={80}
        >
          <div className="flex max-w-[780px] flex-wrap items-center justify-center gap-2.5">
            {PRICING_LINE_ITEMS.map((item, i) => (
              <span key={item} className="contents">
                <span
                  className="stagger-child inline-flex"
                  style={{ ["--i" as string]: i * 2 }}
                >
                  <JunkPill tilt="left">{item}</JunkPill>
                </span>
                <span
                  className="stagger-child font-serif text-[1.25rem] text-ink-soft"
                  style={{ ["--i" as string]: i * 2 + 1 }}
                >
                  {i === PRICING_LINE_ITEMS.length - 1 ? "=" : "+"}
                </span>
              </span>
            ))}
            <span
              className="stagger-child rounded-control border border-[#EFCFC4] bg-[#F9E9E4] px-3.5 py-2 font-serif text-[1.05rem] text-[#A6543C]"
              style={{ ["--i" as string]: PRICING_LINE_ITEMS.length * 2 }}
            >
              $104+/mo
            </span>
          </div>

          <span
            className="stagger-child text-[.85rem] font-extrabold tracking-[.18em] text-ink-soft"
            style={{ ["--i" as string]: PRICING_LINE_ITEMS.length + 1 }}
          >
            VS
          </span>

          <span
            className="stagger-child"
            style={{ ["--i" as string]: PRICING_LINE_ITEMS.length + 2 }}
          >
            <OnePill>allr · one plan</OnePill>
          </span>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-[420px] rounded-card border border-green-line bg-green-tint/50 px-6 py-7 text-center shadow-soft">
          <p className="font-serif text-[1.35rem] text-ink">Early access</p>
          <p className="mt-2 mb-5 text-[.98rem] text-ink-soft">
            One plan. Everything Allr makes. First project is on us.
          </p>
          <Button href="#early-access">{CTA.primary}</Button>
        </Reveal>
      </div>
    </section>
  );
}
