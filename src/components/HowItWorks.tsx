"use client";

import { useEffect, useRef, useState } from "react";
import { MockFor } from "@/components/mocks/Mocks";
import { Reveal } from "@/components/Reveal";
import { Stamp } from "@/components/ui/Stamp";
import { SectionHead } from "@/components/ui/SectionHead";
import { STORY } from "@/lib/brand";
import { cx } from "@/lib/cx";

const NUM_TINTS = [
  "bg-honey-tint text-honey-deep",
  "bg-sage-tint text-ink",
  "bg-green-tint text-green-deep",
];

/**
 * Three steps on the left; one sticky stage on the right that advances as the
 * steps scroll past the middle of the screen: ask → making → live.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      // A band across the middle of the viewport decides the active step.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="relative py-22">
      <div className="wrap">
        <SectionHead eyebrow="How it works" title="Three steps. No stitching." />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
          {/* steps */}
          <ol className="flex flex-col gap-6 lg:gap-[38vh] lg:py-[20vh]">
            {STORY.map((step, i) => (
              <li
                key={step.title}
                ref={(el) => { refs.current[i] = el; }}
                data-step={i}
                className={cx(
                  "story-step rounded-card border bg-card/95 px-6 py-7 shadow-soft backdrop-blur-[2px] transition-[opacity,transform,border-color] duration-500",
                  active === i ? "border-honey-line opacity-100 lg:-translate-x-1" : "border-line lg:opacity-45",
                )}
              >
                <span className={`mb-4 inline-flex size-10 items-center justify-center rounded-control font-serif text-[1.1rem] ${NUM_TINTS[i]}`}>{i + 1}</span>
                <h3 className="mb-2.5 text-[1.28rem]">{step.title}</h3>
                <p className="text-ink-soft">{step.body}</p>
                <p className="mt-3.5 text-[.92rem] font-bold text-honey-deep">{step.aside}</p>
                {/* small-screen stage, inline */}
                <div className="mt-5 lg:hidden"><Stage step={i} /></div>
              </li>
            ))}
          </ol>

          {/* sticky stage */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-15rem)]">
              <Reveal variant="scale"><Stage step={active} /></Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stage({ step }: { step: number }) {
  return (
    <div className="mock-frame relative overflow-hidden rounded-panel border border-line bg-[linear-gradient(160deg,#fbf8f2,#f3ecdd)] p-5 shadow-lift sm:p-7">
      <div className="mb-4 flex justify-end">
        <div className={cx("max-w-[26rem] rounded-card rounded-tr-[4px] bg-ink px-4 py-3 text-[.9rem] leading-snug text-paper shadow-soft transition-[opacity,transform] duration-500", step >= 0 ? "opacity-100" : "opacity-0 translate-y-2")}>
          A landing page for the album launch, with a mailing list signup.
        </div>
      </div>
      <div className="relative aspect-[16/10] w-full">
        <div className={cx("absolute inset-0 overflow-hidden rounded-card border border-line bg-card shadow-lift transition-[opacity,transform] duration-700", step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3")}>
          <MockFor id="websites" />
        </div>
        <div className={cx("absolute inset-0 rounded-card border border-dashed border-honey-line bg-honey-tint/30 transition-opacity duration-500", step === 0 ? "opacity-100" : "opacity-0")}>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[.9rem] font-semibold text-honey-deep">Waiting for your ask…</span>
        </div>
        <Stamp down={step >= 2} size="md" className="absolute -right-2 -bottom-3 z-10">Live</Stamp>
      </div>
      <div className={cx("mt-4 inline-flex items-center gap-2 rounded-control border bg-card px-3 py-1.5 text-[.85rem] font-semibold shadow-soft transition-colors duration-500", step >= 2 ? "border-green-line text-ink" : "border-line-soft text-ink-soft")}>
        <span className={cx("size-1.5 rounded-full", step >= 2 ? "live-ring bg-green" : "bg-honey")} />
        <span className="font-mono tracking-tight">allr.app/album-launch</span>
        {step >= 2 ? <span className="rounded-chip bg-green-tint px-2 py-0.5 text-[.7rem] font-bold tracking-[0.03em] text-green-deep uppercase">v1 · Live</span> : null}
      </div>
    </div>
  );
}
