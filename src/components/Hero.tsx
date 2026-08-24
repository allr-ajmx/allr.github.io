import { Button } from "@/components/ui/Button";
import { AllrMark } from "@/components/ui/AllrMark";
import { Parallax } from "@/components/motion/Parallax";
import { Workspace } from "@/components/Workspace";
import { CTA, EYEBROW_HERO, HERO_SUB, WORDMARK } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative">
      <div className="wrap relative z-10 flex flex-col items-center pt-16 pb-6 text-center sm:pt-24">
        <p className="hero-enter mb-6 inline-flex items-center gap-2 rounded-chip border border-honey-line bg-honey-tint/80 px-3 py-1.5 text-[.78rem] font-bold tracking-[0.04em] text-honey-deep uppercase" style={{ animationDelay: "0s" }}>
          <span className="size-1.5 rounded-full bg-honey" aria-hidden="true" />
          {EYEBROW_HERO}
        </p>

        {/* the name: the mark blooms, the wordmark sits beside it */}
        <div className="hero-enter mb-5 inline-flex items-center gap-3" style={{ animationDelay: "0.08s" }}>
          <AllrMark size={60} bloom className="shrink-0" />
          <span className="font-serif text-[clamp(2.6rem,5vw,3.6rem)] leading-none tracking-tight">{WORDMARK}</span>
        </div>

        <h1 className="hero-enter mb-6 max-w-[22ch] text-[clamp(2.2rem,5.2vw,4.1rem)] leading-[1.05] tracking-[-0.015em]" style={{ animationDelay: "0.16s" }}>
          the one <span className="whitespace-nowrap">subscription that</span>{" "}
          <span className="hero-swash relative whitespace-nowrap text-green-deep before:absolute before:-inset-x-[2%] before:bottom-[.05em] before:-z-10 before:h-[.34em] before:rounded-full before:bg-green-tint before:content-['']">
            replaces all of them.
          </span>
        </h1>
        <p className="hero-enter max-w-[40ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-snug text-ink-soft" style={{ animationDelay: "0.26s" }}>
          {HERO_SUB}
        </p>
        <div className="hero-enter mt-9 flex flex-col items-center gap-3" style={{ animationDelay: "0.34s" }}>
          <Button href="#early-access" size="lg" className="!rounded-full !bg-ink px-7 hover:!bg-[#1a2e28]">
            {CTA.primary}
          </Button>
          <a href="#how" className="text-[.92rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline">{CTA.secondary}</a>
        </div>
      </div>

      <div className="hero-enter-console wrap relative z-10 mt-12 max-w-[1100px] sm:mt-16" style={{ animationDelay: "0.4s" }}>
        <Parallax speed={-0.05}><Workspace /></Parallax>
      </div>
    </section>
  );
}
