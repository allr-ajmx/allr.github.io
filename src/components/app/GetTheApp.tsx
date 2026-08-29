import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { APP } from "@/lib/brand";
import { PLATFORM_LABELS, PLATFORM_ORDER } from "@/lib/releases";

/**
 * Closing section: the desktop platforms, then the mobile closed beta.
 *
 * Each platform button goes to `/download` rather than straight at an asset —
 * that page carries the formats, sizes and requirements.
 */
export function GetTheApp() {
  return (
    <section id="get" className="pt-0 pb-28" data-petal="2">
      <div className="wrap">
        <Reveal
          variant="scale"
          className="relative overflow-hidden rounded-panel bg-[linear-gradient(160deg,var(--color-green),var(--color-green-deep))] px-8 py-20 text-white shadow-[0_24px_60px_rgba(30,122,73,.3)]"
        >
          <span
            aria-hidden="true"
            className="band-blob pointer-events-none absolute -top-17 -left-12 size-80 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="band-blob band-blob--slow pointer-events-none absolute -right-10 -bottom-22 size-70 rounded-full bg-white/[.08]"
          />

          <div className="relative mx-auto flex max-w-[820px] flex-col items-center gap-8 text-center">
            <h2 className="text-[clamp(1.9rem,3.6vw,2.6rem)] text-balance text-white">
              {APP.get.title}
            </h2>

            <div className="flex flex-wrap justify-center gap-3">
              {PLATFORM_ORDER.map((platform) => (
                <Link
                  key={platform}
                  href="/download"
                  className="inline-flex items-center justify-center rounded-control bg-white px-8 py-3.5 text-[1.05rem] font-bold tracking-[-0.01em] text-green-deep no-underline shadow-[0_8px_20px_rgba(0,0,0,.08)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-green-tint active:translate-y-0"
                >
                  {PLATFORM_LABELS[platform]}
                </Link>
              ))}
            </div>

            <div className="flex w-full max-w-[560px] flex-col items-center gap-5 border-t border-white/20 pt-8">
              <p className="text-[1.05rem] text-pretty text-white/85">
                {APP.get.betaLead}
                <strong className="font-bold text-white">
                  {APP.get.betaStrong}
                </strong>
                {APP.get.betaRest}
              </p>
              <WaitlistForm
                id="beta"
                variant="onGreen"
                collection="beta_signups"
                platforms={APP.get.betaPlatforms}
                platformLegend={APP.get.betaLegend}
                submitLabel={APP.get.betaCta}
                done={{ headline: APP.get.betaDone, sub: APP.get.betaDoneSub }}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
