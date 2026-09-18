import { Button } from "@/components/ui/Button";
import { CTA } from "@/lib/brand";

/** Hero CTA group — Get Started (primary) and See how it works (secondary). */
export function HeroCtas() {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
        <Button href="/login/" size="lg">
          {CTA.getStarted}
        </Button>
        <a
          href="#loop"
          className="text-[.95rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline"
        >
          {CTA.secondary}
        </a>
      </div>
      <p className="text-[.9rem] text-ink-soft">{CTA.reassurance}</p>
    </div>
  );
}
