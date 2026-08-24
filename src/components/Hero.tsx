import { Button } from "@/components/ui/Button";
import { AllrMark } from "@/components/ui/AllrMark";
import { Workspace } from "@/components/Workspace";
import { CTA, HERO_HEADLINE, HERO_SUB } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative">
      <div className="wrap relative z-10 flex flex-col items-center pt-16 pb-6 text-center sm:pt-24">
        <div className="hero-enter mb-7" style={{ animationDelay: "0s" }}>
          <AllrMark size={72} bloom />
        </div>
        <h1 className="hero-enter mb-6 max-w-[14ch] text-[clamp(3.2rem,8.5vw,6.4rem)] leading-[0.98] tracking-[-0.02em]" style={{ animationDelay: "0.1s" }}>
          {HERO_HEADLINE}
        </h1>
        <p className="hero-enter max-w-[38ch] text-[clamp(1.1rem,1.6vw,1.35rem)] leading-snug text-ink-soft" style={{ animationDelay: "0.22s" }}>
          {HERO_SUB}
        </p>
        <div className="hero-enter mt-9 flex flex-col items-center gap-3" style={{ animationDelay: "0.34s" }}>
          <Button href="#early-access" size="lg" className="!rounded-full !bg-ink px-7 hover:!bg-[#1a2e28]">
            <AllrMark size={20} /> {CTA.primary}
          </Button>
          <a href="#how" className="text-[.92rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline">{CTA.secondary}</a>
        </div>
      </div>

      <div className="hero-enter-console wrap relative z-10 mt-12 max-w-[1100px] sm:mt-16" style={{ animationDelay: "0.4s" }}>
        <Workspace />
      </div>
    </section>
  );
}
