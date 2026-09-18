import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { CTA } from "@/lib/brand";

/**
 * Final CTA — structural climax via type and whitespace, not a filled panel
 * (DESIGN.md §11 / LANDING_PAGE_STORY §7.9). Get Started → /login/ only.
 */
export function FinalCta() {
  return (
    <section id="final" className="relative pt-16 pb-22">
      <div className="wrap">
        <Reveal className="mx-auto max-w-[720px] px-1 text-center" variant="up">
          <h2 className="mb-4 text-[clamp(2rem,4.2vw,2.9rem)]">
            {CTA.finalHeadline}
          </h2>
          <p className="mb-8 text-[1.15rem] text-ink-soft">{CTA.finalSub}</p>
          <Button href="/login/" size="lg">
            {CTA.getStarted}
          </Button>
          <p className="mt-4 text-[.95rem] text-ink-soft">{CTA.reassurance}</p>
        </Reveal>
      </div>
    </section>
  );
}
