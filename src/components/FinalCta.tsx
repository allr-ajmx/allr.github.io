import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { CTA } from "@/lib/brand";

/**
 * The closing ask. No panel behind it and no rule above it: the page has one
 * continuous background, and a hairline drawn across it reads as a scar.
 * Space does the separating; the green stays where it belongs, on the button.
 */
export function FinalCta() {
  return (
    <section id="early-access" className="relative pt-16 pb-22">
      <div className="wrap">
        <Reveal className="mx-auto max-w-[720px] px-1 text-center" variant="up">
          <h2 className="mb-4 text-[clamp(2rem,4.2vw,2.9rem)]">
            {CTA.finalHeadline}
          </h2>
          <p className="mb-8 text-[1.15rem] text-ink-soft">
            {CTA.finalSub}
          </p>
          <WaitlistForm id="final-waitlist" list="early" />
          <p className="mt-4 text-[.95rem] text-ink-soft">
            {CTA.reassurance}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
