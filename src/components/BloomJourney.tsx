"use client";

import { useEffect, useRef, useState } from "react";
import { MockFrame } from "@/components/mocks/Mocks";
import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { PetalShape } from "@/components/ui/PetalShape";
import { Pill } from "@/components/ui/Pill";
import { BLOOM, OUTPUTS } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { PETALS, rotationToPoint } from "@/lib/petals";

/** Journey order = petal order around the mark, so the gear turns one way. */
const STEPS = PETALS.map((petal) => ({
  petal,
  out: OUTPUTS.find((o) => o.id === petal.id)!,
  /** Rotation that points this petal at the content on the right. */
  rot: rotationToPoint(petal.i, 0),
}));

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The Bloom. A large mark stays pinned on the left and turns as you scroll,
 * so the petal for the current thing points at it; that petal's colour
 * washes the section. Six panels on the right, one per petal. Rotation is
 * driven by scroll position, not time — it moves exactly as far as you do.
 */
export function BloomJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const [t, setT] = useState(0); // continuous 0 … 5
  const active = Math.max(0, Math.min(STEPS.length - 1, Math.round(t)));
  const step = STEPS[active];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(MOTION_QUERY).matches;
    let frame = 0;

    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const line = vh * 0.5;
      // Which panel is under the middle of the screen, and how far through it.
      let value = 0;
      panels.current.forEach((p, i) => {
        if (!p) return;
        const r = p.getBoundingClientRect();
        if (r.top <= line) {
          const inside = Math.min(1, Math.max(0, (line - r.top) / r.height));
          value = i + inside;
        }
      });
      const capped = Math.min(STEPS.length - 1, value);
      setT(reduced ? Math.round(capped) : capped);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Interpolate rotation between neighbouring petals so the gear turns
  // continuously with the scroll, settling exactly on each petal.
  const lo = Math.floor(t);
  const hi = Math.min(STEPS.length - 1, lo + 1);
  const f = t - lo;
  const ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
  const rot = STEPS[lo].rot + (STEPS[hi].rot - STEPS[lo].rot) * ease;

  return (
    <section
      id="makes"
      ref={ref}
      data-petal={step.petal.i}
      className="bloom relative py-22"
      style={{ ["--petal" as string]: step.petal.color }}
    >
      {/* the wash — the active petal's colour, at the edges */}
      <div aria-hidden="true" className="bloom-wash pointer-events-none absolute inset-0 -z-10" />

      <div className="wrap">
        <Reveal className="mx-auto mb-14 max-w-[720px] text-center" variant="blur">
          <Pill tone="honey" className="mb-5">{BLOOM.eyebrow}</Pill>
          <h2 className="mb-4 text-[clamp(1.9rem,3.8vw,2.8rem)]">{BLOOM.title}</h2>
          <p className="text-[1.08rem] text-ink-soft">{BLOOM.sub}</p>
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
          {/* the gear */}
          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-13rem)] flex flex-col items-center gap-7">
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="bloom-halo absolute inset-[-18%] -z-10 rounded-full"
                />
                <AllrMark size={360} rotate={rot} highlight={step.petal.i} instant />
              </div>
              <div className="flex items-center gap-2.5" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <PetalShape
                    key={s.petal.id}
                    color={s.petal.color}
                    className={cx("h-[14px] w-[20px] transition-opacity duration-300", i === active ? "opacity-100" : "opacity-30")}
                  />
                ))}
              </div>
              <p className="text-[.8rem] font-bold tracking-[0.06em] text-ink-soft uppercase" aria-live="polite">
                {BLOOM.progress(active + 1)} · {step.petal.name}
              </p>
            </div>
          </div>

          {/* the petals */}
          <ol className="flex flex-col gap-8 lg:gap-[22vh] lg:py-[12vh]">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li
                  key={s.petal.id}
                  ref={(el) => { panels.current[i] = el; }}
                  className={cx("bloom-panel transition-opacity duration-500 lg:min-h-[56vh] lg:flex lg:flex-col lg:justify-center", on ? "opacity-100" : "lg:opacity-40")}
                >
                  {/* small mark for narrow screens */}
                  <div className="mb-4 lg:hidden">
                    <AllrMark size={56} rotate={rotationToPoint(s.petal.i, -90)} highlight={s.petal.i} />
                  </div>
                  <p className="mb-3 inline-flex items-center gap-2 text-[.78rem] font-bold tracking-[0.06em] text-ink-soft uppercase">
                    <PetalShape color={s.petal.color} className="h-[11px] w-[16px]" />
                    Petal {i + 1} · {s.petal.name}
                  </p>
                  <h3 className="mb-3 text-[clamp(1.5rem,2.6vw,2.1rem)]">{s.out.title}</h3>
                  <p className="mb-7 max-w-[46ch] text-[1.02rem] text-ink-soft">{s.out.body}</p>

                  {/* the thing, on its petal */}
                  <div className="relative">
                    <PetalShape
                      color={s.petal.color}
                      rotate={-24}
                      className="absolute top-[-14%] left-[-10%] -z-10 h-[125%] w-[80%] opacity-70"
                    />
                    <MockFrame
                      id={s.petal.id}
                      className={cx("shadow-lift transition-[box-shadow,border-color] duration-500", on && "live-glow")}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
