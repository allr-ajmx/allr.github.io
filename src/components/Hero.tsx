import { HeroCtas } from "@/components/HeroCtas";
import { HeroEnter } from "@/components/motion/HeroEnter";
import { AllrMark } from "@/components/ui/AllrMark";
import {
  HERO_HEADLINE_REST,
  HERO_SUB,
  WORDMARK,
} from "@/lib/brand";

/**
 * First viewport — brand, headline, sub, CTAs, and the authentic Allr application screenshot.
 * Edge-to-edge presentation cropped directly into rounded corners without outer frame padding.
 */
export function Hero() {
  return (
    <section className="relative">
      <HeroEnter />
      <div className="wrap relative z-10 grid items-center gap-12 pt-24 pb-16 sm:pt-32 sm:pb-24 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-14 lg:pb-28">
        <div className="flex flex-col items-start text-left">
          <div
            className="hero-enter mb-6 inline-flex items-center gap-3"
            data-enter="0.08"
          >
            <AllrMark size={52} bloom className="shrink-0" />
            <span className="font-serif text-[clamp(2.4rem,5vw,3.4rem)] leading-none tracking-[-0.02em] text-ink">
              {WORDMARK}
            </span>
          </div>

          <h1
            className="hero-enter mb-5 max-w-[18ch] font-serif text-[clamp(1.85rem,3.6vw,2.75rem)] leading-[1.12] tracking-[-0.015em] text-ink"
            data-enter="0.16"
          >
            {HERO_HEADLINE_REST}
          </h1>

          <p
            className="hero-enter max-w-[36ch] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-snug text-ink-soft"
            data-enter="0.26"
          >
            {HERO_SUB}
          </p>

          <div className="hero-enter mt-10" data-enter="0.34">
            <HeroCtas />
          </div>
        </div>

        {/* Hero Visual — Allr application screenshot cropped directly into rounded corners */}
        <div
          className="hero-enter-console relative w-full min-w-0"
          data-enter="0.4"
        >
          <div className="overflow-hidden rounded-panel border border-line bg-card shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/placeholders/hero-workspace.png"
              alt="Allr Cloud AI Workspace Application"
              className="block h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
