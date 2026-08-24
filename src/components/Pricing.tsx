import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { CTA, PRICING } from "@/lib/brand";

export function Pricing() {
  return (
    <section id="pricing" className="relative pt-5 pb-22">
      <div className="wrap">
        <Reveal
          className="mx-auto max-w-[640px] rounded-card border border-green-line bg-green-tint/50 px-7 py-9 text-center shadow-soft"
          variant="scale"
        >
          <Pill tone="green" className="mb-4">
            {PRICING.eyebrow}
          </Pill>
          <h2 className="mb-2 text-[clamp(1.5rem,3vw,2rem)]">{PRICING.line}</h2>
          <p className="mb-6 text-[1.02rem] text-ink-soft">{PRICING.sub}</p>
          <Button href="#early-access">{CTA.primary}</Button>
        </Reveal>
      </div>
    </section>
  );
}
