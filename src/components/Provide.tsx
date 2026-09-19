"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { AllrMark } from "@/components/ui/AllrMark";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHead } from "@/components/ui/SectionHead";
import { cx } from "@/lib/cx";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { rotationToPoint } from "@/lib/petals";

const HARNESSES = [
  {
    id: "product",
    slotId: "harness-product",
    petalIndex: 0,
    petalColor: "#74926b",
    tag: "Act II · Beat 4",
    title: "The Product Harness",
    sub: "Turn intent into a functioning, live product surface.",
    body: "Allr provides the reusable baseline required to turn a product idea into an operating software asset: user journeys, authentication and account state, data models, integrated payment rails, and customer publishing.",
    bullets: [
      "Customer journeys & application surfaces",
      "Authentication and persistent state",
      "Integrated payment rails & subscriptions",
      "One-click publishing & deploy endpoints",
    ],
  },
  {
    id: "intelligence",
    slotId: "harness-intelligence",
    petalIndex: 1,
    petalColor: "#f7c14c",
    tag: "Act II · Beat 5",
    title: "The Intelligence Harness",
    sub: "Continuous research and reasoning attached to an objective.",
    body: "This is not an unbounded chat session. The intelligence system operates within a persistent environment with state, tools, schedules, and defined customer outputs.",
    bullets: [
      "Market, competitor & customer intelligence",
      "Continuous background agents & cron runners",
      "Document and knowledge processing pipelines",
      "Model-independent intelligence routing",
    ],
  },
  {
    id: "maintenance",
    slotId: "harness-maintenance",
    petalIndex: 4,
    petalColor: "#34905e",
    tag: "Act II · Beat 6",
    title: "The Maintenance Harness",
    sub: "Continuous operating capability — not an emergency project.",
    body: "A product is not finished when it is first deployed. Allr preserves the operational context around a product so it can be monitored, healed, and maintained rather than repeatedly recreated.",
    bullets: [
      "Failure detection and automatic recovery workflows",
      "Operating history, procedures, and version snapshots",
      "Continuous dependency & API update monitors",
      "Human review escalation paths & audit logs",
    ],
  },
] as const;

/**
 * Provide — The 3 Harnesses (Act II of Master Story).
 * Scrollytelling stage:
 * The 3 indicator tabs and active display card remain fixed in the viewport while
 * scroll progress smoothly cross-fades between Harness 01, 02, and 03.
 */
export function Provide() {
  const [activeTab, setActiveTab] = useState(0);
  const scope = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  const currentHarness = HARNESSES[activeTab] ?? HARNESSES[0];

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
            ? Math.round(window.innerHeight * 0.5 - 270)
            : 80;
        };

        const st = ScrollTrigger.create({
          trigger: track,
          start: () => "top " + getStickyTop(),
          end: () => "bottom " + (getStickyTop() + (stickyRef.current?.offsetHeight ?? 580)),
          scrub: 0.5,
          onUpdate: (self) => {
            const nextTab = Math.min(2, Math.floor(self.progress * 3));
            setActiveTab(nextTab);
          },
        });

        triggerRef.current = st;

        return () => st.kill();
      });

      return () => mm.revert();
    },
    { scope },
  );

  const handleTabSelect = (idx: number) => {
    setActiveTab(idx);
    const st = triggerRef.current;
    if (st) {
      const progressTarget = (idx + 0.5) / 3;
      const targetScroll = st.start + progressTarget * (st.end - st.start);
      window.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  };

  return (
    <section id="provide" ref={scope} className="relative pt-12 pb-20 sm:pt-16 sm:pb-28">
      <div className="wrap relative">
        <SectionHead
          eyebrow="Act II · The Operating Architecture"
          title="The Product-and-Operations Harness."
        >
          You spend time on what is unique to your customer. Allr holds the repeated operating baseline underneath.
        </SectionHead>

        {/* Scroll Runway Track */}
        <div ref={trackRef} className="relative mt-8 min-h-[240vh] lg:min-h-[260vh]">
          {/* Unified Sticky Stage: Indicator Tabs & Card locked in view */}
          <div
            ref={stickyRef}
            className="sticky top-20 lg:top-[calc(50vh-17rem)]"
          >
            {/* Mobile: Single Card with interactive navigation pills (matching HowItWorks / Ideate) */}
            <div className="mx-auto mb-4 sm:hidden w-full max-w-[420px]">
              <div className="rounded-card border border-honey-line bg-card p-4 shadow-soft transition-all duration-300">
                {/* Header: Mark, Harness Counter, 3 Interactive Pills */}
                <div className="mb-3 flex items-center justify-between border-b border-line-soft pb-2.5">
                  <div className="flex items-center gap-2">
                    <AllrMark
                      size={18}
                      highlight={currentHarness.petalIndex}
                      rotate={rotationToPoint(currentHarness.petalIndex, -90)}
                    />
                    <span className="font-mono text-[.75rem] font-bold text-ink uppercase tracking-wider">
                      Harness 0{activeTab + 1} of 03
                    </span>
                  </div>

                  {/* 3 Harness Navigation Pills */}
                  <div
                    className="flex items-center gap-1.5"
                    role="tablist"
                    aria-label="Harness selector"
                  >
                    {HARNESSES.map((harness, idx) => {
                      const isCurrent = activeTab === idx;
                      return (
                        <button
                          key={harness.id}
                          type="button"
                          role="tab"
                          aria-selected={isCurrent}
                          aria-label={`Jump to Harness ${idx + 1}: ${harness.title}`}
                          onClick={() => handleTabSelect(idx)}
                          className="group relative flex items-center justify-center p-1 cursor-pointer transition-all duration-300 focus-visible:outline-none"
                        >
                          <span
                            className={cx(
                              "block rounded-full transition-all duration-300",
                              isCurrent
                                ? "h-2 w-5"
                                : "h-2 w-2 bg-ink-soft/25 hover:bg-ink-soft/50",
                            )}
                            style={{
                              backgroundColor: isCurrent ? harness.petalColor : undefined,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content: Badge, Title, Subtitle with smooth cross-fade */}
                <div className="relative grid grid-cols-1 grid-rows-1 overflow-hidden min-h-[64px]">
                  {HARNESSES.map((harness, idx) => {
                    const isCurrent = activeTab === idx;
                    return (
                      <div
                        key={harness.id}
                        className={cx(
                          "col-start-1 row-start-1 transition-all duration-300 ease-out motion-reduce:transition-none",
                          isCurrent
                            ? "opacity-100 translate-y-0 pointer-events-auto z-10"
                            : "opacity-0 translate-y-2 pointer-events-none z-0",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[0.68rem] font-mono font-bold px-1.5 py-0.5 rounded-full border"
                            style={{
                              borderColor: `${harness.petalColor}50`,
                              backgroundColor: `${harness.petalColor}15`,
                              color: harness.petalColor,
                            }}
                          >
                            0{idx + 1}
                          </span>
                          <h3 className="font-serif text-[1.08rem] text-ink font-normal">
                            {harness.title}
                          </h3>
                        </div>
                        <p className="text-[.82rem] leading-snug text-ink-soft line-clamp-2">
                          {harness.sub}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop: Interactive 3 Harness Indicator Tabs */}
            <div className="mx-auto mb-6 sm:mb-8 hidden sm:grid max-w-[900px] sm:grid-cols-3 gap-3">
              {HARNESSES.map((harness, i) => {
                const isSelected = activeTab === i;
                return (
                  <button
                    key={harness.id}
                    type="button"
                    onClick={() => handleTabSelect(i)}
                    className={cx(
                      "flex flex-col items-start rounded-card border p-3.5 sm:p-4 text-left transition-all duration-300 cursor-pointer",
                      isSelected
                        ? "border-honey-line bg-card shadow-soft -translate-y-0.5 ring-2 ring-honey-line/50"
                        : "border-line-soft bg-paper/50 hover:bg-card/80 opacity-70 hover:opacity-100",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <AllrMark
                        size={18}
                        highlight={isSelected ? harness.petalIndex : undefined}
                        rotate={rotationToPoint(harness.petalIndex, -90)}
                      />
                      <span className="font-mono text-[.72rem] font-bold text-ink-soft uppercase tracking-wide">
                        Harness 0{i + 1}
                      </span>
                    </div>
                    <h3 className="font-serif text-[1.05rem] text-ink">
                      {harness.title}
                    </h3>
                    <p className="mt-1 text-[.82rem] leading-snug text-ink-soft line-clamp-2">
                      {harness.sub}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Fixed Display Card with Smooth Cross-Fade across all 3 Harnesses */}
            <div className="mx-auto max-w-[1040px] rounded-panel border border-line bg-card p-5 shadow-soft sm:p-10">
              <div className="relative grid grid-cols-1 grid-rows-1">
                {HARNESSES.map((harness, i) => {
                  const isCurrent = activeTab === i;
                  return (
                    <div
                      key={harness.id}
                      className={cx(
                        "col-start-1 row-start-1 grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 transition-all duration-400 ease-out motion-reduce:transition-none",
                        isCurrent
                          ? "opacity-100 translate-y-0 pointer-events-auto z-10"
                          : "opacity-0 translate-y-2.5 pointer-events-none z-0",
                      )}
                    >
                      {/* Harness Copy & Bullets */}
                      <div className="text-left">
                        <div className="mb-3 inline-flex items-center gap-2">
                          <AllrMark
                            size={24}
                            highlight={harness.petalIndex}
                            rotate={rotationToPoint(harness.petalIndex, -90)}
                          />
                          <span className="font-mono text-[.75rem] font-bold text-honey-deep uppercase tracking-wider">
                            {harness.tag}
                          </span>
                        </div>

                        <h3 className="hidden sm:block mb-2 font-serif text-[clamp(1.5rem,2.8vw,2.1rem)] text-ink">
                          {harness.title}
                        </h3>
                        <p className="hidden sm:block mb-3 font-medium text-ink-soft text-[1.05rem]">
                          {harness.sub}
                        </p>
                        <p className="mb-4 sm:mb-6 text-[.92rem] sm:text-[.95rem] leading-relaxed text-ink-soft">
                          {harness.body}
                        </p>

                        {/* Concrete Capabilities */}
                        <ul className="space-y-2.5 border-t border-line-soft pt-5 text-[.88rem]">
                          {harness.bullets.map((bullet) => (
                            <li key={bullet} className="flex items-center gap-2.5 text-ink">
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: harness.petalColor }}
                              />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Harness Visual Placeholder with Logo Rotation (4:3 aspect ratio) */}
                      <div className="w-full">
                        <PlaceholderImage
                          slotId={harness.slotId}
                          label={harness.title}
                          description={harness.sub}
                          badge={harness.tag}
                          dimensions="600 × 450"
                          aspectRatio="aspect-[4/3]"
                          petalHighlight={harness.petalIndex}
                          petalRotate={rotationToPoint(harness.petalIndex, -90)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
