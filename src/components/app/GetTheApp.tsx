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
    <section id="get" className="relative pt-10 pb-28" data-petal="2">
      <div className="wrap">
        <Reveal variant="up" className="relative">
          <div className="relative mx-auto flex max-w-[820px] flex-col items-center gap-8 text-center">
            <h2 className="text-[clamp(1.9rem,3.6vw,2.6rem)] text-balance">
              {APP.get.title}
            </h2>

            <div className="flex flex-wrap justify-center gap-3">
              {PLATFORM_ORDER.map((platform) => (
                <Link
                  key={platform}
                  href="/download"
                  className="inline-flex items-center justify-center rounded-control bg-green px-8 py-3.5 text-[1.05rem] font-bold tracking-[-0.01em] text-white no-underline shadow-[0_8px_20px_rgba(30,122,73,.18)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-green-deep active:translate-y-0"
                >
                  {PLATFORM_LABELS[platform]}
                </Link>
              ))}
            </div>

            <div className="flex w-full max-w-[560px] flex-col items-center gap-5 pt-4">
              <p className="text-[1.05rem] text-pretty text-ink-soft">
                {APP.get.betaLead}
                <strong className="font-bold text-ink">
                  {APP.get.betaStrong}
                </strong>
                {APP.get.betaRest}
              </p>
              <WaitlistForm
                id="beta"
                list="beta"
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
