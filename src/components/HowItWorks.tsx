"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { SectionHead } from "@/components/ui/SectionHead";
import { InteractiveWorkspace } from "@/components/workspace/InteractiveWorkspace";
import { LIFECYCLE, STORY } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { PETALS, rotationToPoint } from "@/lib/petals";

/**
 * Loop — Operating Lifecycle (Act III of Master Story).
 * Fixed-position scrollytelling stage:
 * The step card stays fixed in place on the left while its content fade-transitions
 * across all 6 steps as the user scrolls, driving the unified interactive workspace on the right.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [showPostOverlay, setShowPostOverlay] = useState(false);
  const scope = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const sticky = stickyRef.current;
      if (!track || !sticky) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const getStickyTop = () => {
          if (typeof window === "undefined") return 80;
          return window.innerWidth >= 1024
            ? Math.round(window.innerHeight * 0.5 - 255)
            : 80;
        };

        const st = ScrollTrigger.create({
          trigger: track,
          start: () => "top " + getStickyTop(),
          end: () => "bottom " + (getStickyTop() + (stickyRef.current?.offsetHeight ?? 530)),
          scrub: 0.5,
          onUpdate: (self) => {
            const p = self.progress;
            // 6 lifecycle steps (0 to 5)
            const nextStep = Math.min(5, Math.floor(p * 6));
            setActive(nextStep);
            // Step 06 (Scale) features a two-phase scroll experience:
            // Phase 1: Chat draft with user prompt & screenshot preview
            // Phase 2: Live tweet overlay on X (triggers in the second half of step 6)
            setShowPostOverlay(p > 0.916);
          },
        });

        triggerRef.current = st;

        return () => st.kill();
      });

      return () => mm.revert();
    },
    { scope },
  );

  const handleStepSelect = (idx: number) => {
    setActive(idx);
    setShowPostOverlay(idx === 5);
    const st = triggerRef.current;
    if (st) {
      const progressTarget = (idx + 0.5) / 6;
      const targetScroll = st.start + progressTarget * (st.end - st.start);
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  };

  const currentPetal = PETALS[active] ?? PETALS[0];

  return (
    <section id="loop" ref={scope} className="relative pt-12 pb-20 sm:pt-16 sm:pb-28">
      <div className="wrap relative">
        <SectionHead
          eyebrow="Act III · From Intent to Operation"
          title={LIFECYCLE.title}
        >
          {LIFECYCLE.sub}
        </SectionHead>

        {/* Scroll Runway Track */}
        <div ref={trackRef} className="relative mt-8 min-h-[300vh] lg:min-h-[340vh]">
          {/* Unified Sticky Stage: Keeps both the step card and workspace fixed in viewport */}
          <div
            ref={stickyRef}
            className="sticky top-20 lg:top-[calc(50vh-16rem)]"
          >
            <div className="mx-auto max-w-fit grid gap-5 lg:gap-6 lg:grid-cols-[minmax(0,22.5rem)_minmax(0,42.5rem)] items-start justify-center">
              {/* Left Column: Fixed-position Step Card with smooth content cross-fade */}
              <div className="relative w-full max-w-[360px] lg:w-[22.5rem]">
                <div className="rounded-card border border-honey-line bg-card p-5 sm:p-6 shadow-soft transition-all duration-300">
                  {/* Step Header: Petal Icon, Step Number, and Interactive Navigation Pills */}
                  <div className="mb-4 flex items-center justify-between border-b border-line-soft pb-3">
                    <div className="flex items-center gap-2">
                      <AllrMark
                        size={19}
                        highlight={currentPetal.i}
                        rotate={rotationToPoint(currentPetal.i, -90)}
                      />
                      <span className="font-mono text-[.78rem] font-bold text-ink uppercase tracking-wider">
                        Step 0{active + 1} of 06
                      </span>
                    </div>

                    {/* 6 Step Interactive Pills */}
                    <div
                      className="flex items-center gap-1.5"
                      role="tablist"
                      aria-label="Lifecycle steps"
                    >
                      {STORY.map((step, idx) => {
                        const isCurrent = active === idx;
                        const petal = PETALS[idx] ?? PETALS[0];
                        return (
                          <button
                            key={step.title}
                            type="button"
                            role="tab"
                            aria-selected={isCurrent}
                            aria-label={`Jump to Step ${idx + 1}: ${step.title}`}
                            onClick={() => handleStepSelect(idx)}
                            className="group relative flex items-center justify-center p-1 cursor-pointer transition-all duration-300 focus-visible:outline-none"
                          >
                            <span
                              className={cx(
                                "block rounded-full transition-all duration-300",
                                isCurrent
                                  ? "h-2 w-5 sm:w-6"
                                  : "h-2 w-2 bg-ink-soft/25 hover:bg-ink-soft/50",
                              )}
                              style={{
                                backgroundColor: isCurrent ? petal.color : undefined,
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fade-transitioned Step Content */}
                  <div className="relative grid grid-cols-1 grid-rows-1 overflow-hidden min-h-[145px] sm:min-h-[135px]">
                    {STORY.map((step, idx) => {
                      const isCurrent = active === idx;
                      const petal = PETALS[idx] ?? PETALS[0];
                      return (
                        <div
                          key={step.title}
                          className={cx(
                            "col-start-1 row-start-1 transition-all duration-300 ease-out motion-reduce:transition-none",
                            isCurrent
                              ? "opacity-100 translate-y-0 pointer-events-auto z-10"
                              : "opacity-0 translate-y-2 pointer-events-none z-0",
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-[0.72rem] font-mono font-bold px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: `${petal.color}50`,
                                backgroundColor: `${petal.color}15`,
                                color: petal.color,
                              }}
                            >
                              0{idx + 1}
                            </span>
                            <h3 className="font-serif text-[1.28rem] sm:text-[1.35rem] text-ink font-normal">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-[.92rem] sm:text-[.95rem] leading-relaxed text-ink-soft">
                            {step.body}
                          </p>
                          <p className="mt-2.5 text-[.85rem] sm:text-[.88rem] font-semibold text-honey-deep">
                            {step.aside}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Desktop Interactive Workspace */}
              <div className="hidden lg:block w-full max-w-[680px]">
                <Reveal variant="scale">
                  <InteractiveWorkspace
                    stepIndex={active}
                    showPostOverlay={showPostOverlay}
                    onStepChange={handleStepSelect}
                  />
                </Reveal>
              </div>
            </div>

            {/* Mobile Workspace: Appears neatly below the fixed card on mobile */}
            <div className="mt-6 lg:hidden w-full max-w-[680px] mx-auto">
              <InteractiveWorkspace
                stepIndex={active}
                showPostOverlay={showPostOverlay}
                onStepChange={handleStepSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
