import { Reveal } from "@/components/Reveal";
import { JunkPill, OnePill } from "@/components/ui/JunkPill";
import { SectionHead } from "@/components/ui/SectionHead";

const LINE_ITEMS = [
  "Slides $18",
  "Docs $12",
  "Video $29",
  "Sites $25",
  "Apps $20",
];

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
            {LINE_ITEMS.map((item, i) => (
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
                  {i === LINE_ITEMS.length - 1 ? "=" : "+"}
                </span>
              </span>
            ))}
            <span
              className="stagger-child rounded-full border-[1.5px] border-[#EFCFC4] bg-[#F9E9E4] px-[1.3em] py-[.5em] font-serif text-[1.1rem] text-[#A6543C]"
              style={{ ["--i" as string]: LINE_ITEMS.length * 2 }}
            >
              $104+/mo
            </span>
          </div>

          <span
            className="stagger-child text-[.85rem] font-extrabold tracking-[.18em] text-ink-soft"
            style={{ ["--i" as string]: LINE_ITEMS.length + 1 }}
          >
            VS
          </span>

          <span
            className="stagger-child"
            style={{ ["--i" as string]: LINE_ITEMS.length + 2 }}
          >
            <OnePill>allr · one plan</OnePill>
          </span>
        </Reveal>
      </div>
    </section>
  );
}
