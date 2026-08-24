import { Button } from "@/components/ui/Button";
import { AllrMark } from "@/components/ui/AllrMark";
import { Parallax } from "@/components/motion/Parallax";
import { Workspace } from "@/components/Workspace";
import { CTA, HERO_SUB } from "@/lib/brand";

export function Hero() {
  return (
    <section className="relative">
      <div className="wrap relative z-10 flex flex-col items-center pt-24 pb-3 text-center sm:pt-36">

        <h1 className="hero-enter mb-8 max-w-[22ch] text-[clamp(2.1rem,4.8vw,3.7rem)] leading-[1.05] tracking-[-0.015em]" style={{ animationDelay: "0.16s" }}>
          the <span className="whitespace-nowrap"><AllrMark size="0.82em" bloom spin className="mark--letter" />ne</span> subscription{" "}
          <span className="whitespace-nowrap sm:whitespace-normal">
            that <span className="text-green-deep">replaces</span>
          </span>{" "}
          <span className="whitespace-nowrap text-green-deep">all of them.</span>
        </h1>
        <p className="hero-enter max-w-[40ch] text-[clamp(1.05rem,1.5vw,1.25rem)] leading-snug text-ink-soft" style={{ animationDelay: "0.26s" }}>
          {HERO_SUB}
        </p>
        <div className="hero-enter mt-12 flex flex-col items-center gap-3" style={{ animationDelay: "0.34s" }}>
          <Button href="#early-access" size="lg" className="!rounded-full !bg-ink px-7 hover:!bg-[#1a2e28]">
            {CTA.primary}
          </Button>
          <a href="#how" className="text-[.92rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline">{CTA.secondary}</a>
        </div>
      </div>

      <div className="hero-enter-console wrap relative z-10 mt-16 max-w-[1100px] pb-16 sm:mt-24 sm:pb-28" style={{ animationDelay: "0.4s" }}>
        <Parallax speed={-0.05}><Workspace /></Parallax>
      </div>
    </section>
  );
}
