"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { MockFor } from "@/components/mocks/Mocks";
import { AllrMark } from "@/components/ui/AllrMark";
import { SHOWCASE, WORKSPACE } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { PETAL_BY_ID, rotationToPoint } from "@/lib/petals";
import { gsap, ScrollTrigger, EASE } from "@/lib/motion";

/** MOTION.md §5.1: the artifact settles at 1150ms and seals live at 1470ms. */
const MAKING = 1.15;
const STAMP = 0.32;
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function useShouldAnimate() {
  return useSyncExternalStore(subscribe, () => !window.matchMedia(MOTION_QUERY).matches, () => true);
}

type Phase = "idle" | "making" | "done" | "live";

/**
 * The hero window: an Allr workspace with the ask on the left and the thing
 * it made on the right. Tabs switch what is being made; each switch plays one
 * short beat — making → done → sealed live. First play on scroll-in.
 */
export function Workspace() {
  const root = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const shouldAnimate = useShouldAnimate();
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  // `run` is the clock: every beat (first scroll-in, each tab) bumps it, and
  // the timers below key off it alone — keying off `phase` would cancel the
  // second timer the moment the first one fired.
  const [run, setRun] = useState(0);
  const item = SHOWCASE[active];
  const petal = PETAL_BY_ID[item.id];

  const play = useCallback((i: number) => {
    setActive(i);
    setPhase("making");
    setRun((n) => n + 1);
  }, []);

  const p: Phase = shouldAnimate ? phase : "live";
  const made = p === "done" || p === "live";
  const live = p === "live";

  // First play when the window scrolls in. One shot — the tabs are the only
  // way to see it again.
  useGSAP(
    () => {
      if (!shouldAnimate) return;
      const st = ScrollTrigger.create({
        trigger: ref.current,
        start: "top 80%",
        once: true,
        onEnter: () => { setPhase("making"); setRun((n) => n + 1); },
      });
      return () => st.kill();
    },
    { scope: ref, dependencies: [shouldAnimate] },
  );

  // The beats, on GSAP's clock rather than two loose timers. A timeline can be
  // killed as one thing, so a fast tab switch cannot leave a stale phase
  // change in flight.
  useGSAP(
    () => {
      if (run === 0 || !shouldAnimate) return;
      const el = root.current;
      if (!el) return;
      const q = <T extends Element>(sel: string) => Array.from(el.querySelectorAll<T>(sel));

      const tl = gsap.timeline();

      // The caption and the reply lines settle in.
      const caption = q<HTMLElement>(".ws-caption");
      if (caption.length) tl.from(caption, { opacity: 0, y: 14, duration: 0.45, ease: EASE.soft }, 0);
      const steps = q<HTMLElement>(".ws-step");
      if (steps.length) tl.from(steps, { opacity: 0, y: 14, duration: 0.4, stagger: 0.09, ease: EASE.soft }, 0);

      // The deploy line along the top edge and the ink bar under the artifact
      // both fill across exactly the making beat — one constant, not three.
      const bars = [...q<HTMLElement>(".ws-line"), ...q<HTMLElement>(".ws-inkbar")];
      if (bars.length) {
        tl.fromTo(bars, { scaleX: 0 }, { scaleX: 0.9, duration: MAKING, ease: EASE.ink }, 0);
      }

      tl.call(() => setPhase("done"), undefined, MAKING);
      tl.call(() => setPhase("live"), undefined, MAKING + STAMP);
      return () => { tl.kill(); };
    },
    { dependencies: [run, shouldAnimate] },
  );

  // Going live: the line completes, turns green and fades; the checkmark draws
  // itself. Keyed on `live` because both elements only exist by then.
  useGSAP(
    () => {
      if (!live || !shouldAnimate) return;
      const el = root.current;
      if (!el) return;
      const tl = gsap.timeline();
      const line = el.querySelector<HTMLElement>(".ws-line");
      if (line) {
        tl.to(line, { scaleX: 1, duration: 0.35, ease: EASE.soft }, 0)
          .to(line, { opacity: 0, duration: 1.05, ease: EASE.soft }, 0.35);
      }
      const ring = el.querySelector<SVGCircleElement>(".live-check__ring");
      const tick = el.querySelector<SVGPathElement>(".live-check__tick");
      if (ring) tl.fromTo(ring, { strokeDashoffset: 44 }, { strokeDashoffset: 0, duration: 0.5, ease: EASE.soft }, 0);
      if (tick) tl.fromTo(tick, { strokeDashoffset: 12 }, { strokeDashoffset: 0, duration: 0.35, ease: EASE.soft }, 0.35);
      return () => { tl.kill(); };
    },
    { dependencies: [live, shouldAnimate] },
  );

  return (
    <div ref={root} className="w-full">
      {/* tabs + caption — one row, like a caption under a photograph */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1 rounded-control border border-line bg-card p-1 shadow-soft" role="tablist" aria-label="What Allr makes">
          {SHOWCASE.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => play(i)}
                className={cx(
                  "cursor-pointer rounded-chip px-3.5 py-1.5 text-[.9rem] font-bold transition-[background-color,color] duration-200",
                  on ? "bg-green-deep text-white" : "text-ink-soft hover:bg-paper hover:text-ink",
                )}
              >
                {s.tab}
              </button>
            );
          })}
        </div>
        <p key={item.id} className="ws-caption text-[.95rem] text-ink-soft md:max-w-[34rem] md:text-right">{item.caption}</p>
      </div>

      {/* the window */}
      <div
        ref={ref}
        className={cx(
          "relative overflow-hidden rounded-panel border bg-card shadow-[0_30px_80px_rgba(34,59,51,.14)] transition-[border-color,box-shadow] duration-500",
          live ? "border-green-line shadow-[0_30px_80px_rgba(46,158,99,.16),0_0_0_4px_rgba(46,158,99,.06)]" : "border-line",
        )}
      >
        {/* deploy line — fills while making, completes green on live, then fades */}
        <span
          key={`line-${run}`}
          aria-hidden="true"
          className={cx(
            "ws-line absolute inset-x-0 top-0 z-20 h-[2px] origin-left",
            p === "making" && "ws-line--making",
            made && "ws-line--live",
          )}
        />

        {/* title bar */}
        <div className="flex items-center gap-3 border-b border-line-soft bg-paper/70 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#EFC1A9]" /><span className="size-2.5 rounded-full bg-[#F2D49A]" /><span className="size-2.5 rounded-full bg-[#BFDCC7]" />
          </span>
          <span className="ml-2 inline-flex items-center gap-1.5 text-[.85rem] font-bold"><AllrMark size={16} highlight={petal.i} rotate={rotationToPoint(petal.i, -90)} /> allr</span>
          <span className="min-w-0 truncate text-[.85rem] text-ink-soft">/ {item.slug}</span>
          <span className="ml-auto hidden items-center gap-2 rounded-control sm:inline-flex border border-line-soft bg-card px-2.5 py-1 font-mono text-[.78rem] tracking-tight text-ink">
            <span key={`dot-${run}`} className={cx("relative size-1.5 rounded-full transition-colors duration-300", live ? "live-ring bg-green" : p === "making" ? "dot-making" : "bg-line")} />
            allr.app/{item.slug}
          </span>
        </div>

        <div className="grid md:grid-cols-[minmax(0,17rem)_1fr]">
          {/* the ask */}
          <div className="flex flex-col gap-4 border-b border-line-soft bg-paper/40 p-5 md:border-r md:border-b-0">
            <div className="self-end rounded-card rounded-tr-[4px] bg-ink px-4 py-3 text-[.9rem] leading-snug text-paper shadow-soft">
              {item.prompt}
            </div>
            <div key={`reply-${run}`} className="flex flex-col gap-2 text-[.88rem]">
              {WORKSPACE.steps.map((step, i) => {
                const on = !shouldAnimate || (p === "making" ? i === 0 : made);
                const doing = shouldAnimate && p === "making" && i === 1;
                return (
                  <span key={step} className={cx("ws-step inline-flex items-center gap-2 transition-colors duration-300", on ? "text-ink" : doing ? "text-ink-soft" : "text-ink-soft/60")} style={{ ["--i" as string]: i }}>
                    <span className={cx("flex size-4 items-center justify-center rounded-full text-[.6rem] font-bold", on ? "bg-green text-white" : doing ? "dot-making" : "border border-line")}>{on ? "✓" : ""}</span>
                    {step}
                  </span>
                );
              })}
            </div>
            <p className={cx("mt-auto inline-flex items-center gap-1.5 text-[.85rem] font-semibold transition-colors duration-300", live ? "text-green-deep" : "text-ink-soft")} role="status">
              {live ? <LiveCheck key={`check-${run}`} /> : null}
              {p === "making" ? WORKSPACE.making(item.noun) : live ? WORKSPACE.live : "\u00a0"}
            </p>
          </div>

          {/* the thing */}
          <div className="relative p-4 transition-[background-color] duration-700 sm:p-6" style={{ background: `color-mix(in srgb, ${petal.color} 14%, var(--color-paper))` }}>
            <div className="relative aspect-[16/10] w-full">
              <div key={`mock-${run}`} className={cx("ws-artifact absolute inset-0 overflow-hidden rounded-card border bg-card shadow-lift", made && "ws-artifact--in", live ? "live-glow" : "border-line")}>
                <MockFor id={item.id} />
              </div>
              {p === "making" ? (
                <div className="absolute inset-0 rounded-card border border-dashed border-honey-line bg-honey-tint/30">
                  <span className="ws-inkbar absolute inset-x-0 top-0 h-[3px] origin-left rounded-full bg-honey" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A checkmark that draws itself once. */
function LiveCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" className="live-check__ring" />
      <path d="M4.5 8.4 7 10.8 11.6 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="live-check__tick" />
    </svg>
  );
}
