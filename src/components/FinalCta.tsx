import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { CTA } from "@/lib/brand";

export function FinalCta() {
  return (
    <section id="early-access" className="pt-5 pb-22">
      <div className="wrap">
        <Reveal
          className="relative overflow-hidden rounded-panel bg-[linear-gradient(160deg,var(--color-green),var(--color-green-deep))] px-7 py-16 text-center text-white shadow-[0_24px_60px_rgba(30,122,73,.3)] sm:px-8 sm:py-[70px]"
          variant="scale"
        >
          <span
            aria-hidden="true"
            className="band-blob absolute -top-[140px] -left-[100px] size-[300px] rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="band-blob band-blob--slow absolute -right-[150px] -bottom-[220px] size-[400px] rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.12),transparent_65%)]"
          />

          <h2 className="relative z-10 mb-4 text-[clamp(2rem,4.2vw,2.9rem)]">
            {CTA.finalHeadline}
          </h2>
          <p className="relative z-10 mb-8 text-[1.15rem] opacity-95">
            {CTA.finalSub}
          </p>
          <div className="relative z-10">
            <WaitlistForm variant="onGreen" id="final-waitlist" />
          </div>
          <p className="relative z-10 mt-4 text-[.95rem] opacity-85">
            {CTA.reassurance}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
