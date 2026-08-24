import { HostingScene } from "@/components/HostingScene";
import { Reveal } from "@/components/Reveal";
import { HOSTED } from "@/lib/brand";

/** The one dark band on the page — the counterpart to all that paper. */
export function PublishingBand() {
  return (
    <section id="publish" className="pt-6 pb-22">
      <div className="wrap">
        <Reveal
          className="relative overflow-hidden rounded-panel bg-ink px-7 py-14 text-paper shadow-[0_30px_80px_rgba(34,59,51,.28)] sm:px-10 sm:py-16"
          variant="scale"
        >
          {/* a little lamplight in the dark */}
          <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(247,193,76,.16),transparent_70%)]" />
          <span aria-hidden="true" className="pointer-events-none absolute -right-32 -bottom-40 size-[460px] rounded-full bg-[radial-gradient(closest-side,rgba(52,144,94,.22),transparent_70%)]" />

          <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-16">
            <div className="max-w-[34rem]">
              <span className="mb-[18px] inline-flex items-center gap-2 rounded-chip border border-green/40 bg-green/15 px-3 py-1.5 text-[.8rem] font-bold tracking-[0.04em] text-[#9fe0bb] uppercase">
                <span className="live-ring size-1.5 rounded-full bg-green" />
                {HOSTED.eyebrow}
              </span>
              <h2 className="mb-[18px] text-[clamp(1.7rem,3.2vw,2.3rem)] text-paper">{HOSTED.title}</h2>
              <p className="mb-4 text-[1.02rem] leading-relaxed text-paper/80">{HOSTED.p1}</p>
              <p className="mb-7 text-[1.02rem] leading-relaxed text-paper/80">{HOSTED.p2}</p>
              <p className="font-serif text-[1.18rem] text-honey">{HOSTED.aside}</p>
            </div>
            <div className="py-4">
              <HostingScene />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
