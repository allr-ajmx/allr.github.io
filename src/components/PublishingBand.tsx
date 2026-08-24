import { HostingScene } from "@/components/HostingScene";
import { Reveal } from "@/components/Reveal";
import { Pill } from "@/components/ui/Pill";
import { HOSTED } from "@/lib/brand";

/**
 * The web sits behind the whole section, its left half under the copy —
 * petals fade as they pass into the text and return on the other side.
 */
export function PublishingBand() {
  return (
    <section id="publish" className="relative pt-28 pb-22 sm:pt-40">
      <div className="wrap relative">
        {/* the scene, full width; below lg it drops under the copy */}
        <Reveal variant="fade" className="overflow-x-auto lg:absolute lg:inset-0 lg:overflow-visible">
          <div className="min-w-[760px] lg:min-w-0 lg:h-full">
            <HostingScene />
          </div>
        </Reveal>

        <Reveal className="relative z-10 max-w-[26rem] lg:min-h-[720px] lg:flex lg:flex-col lg:justify-center">
          <Pill tone="green" className="mb-[18px] self-start">{HOSTED.eyebrow}</Pill>
          <h2 className="mb-[18px] text-[clamp(1.7rem,3.2vw,2.3rem)]">{HOSTED.title}</h2>
          <p className="mb-4 text-[1.02rem] leading-relaxed text-ink-soft">{HOSTED.p1}</p>
          <p className="mb-6 text-[1.02rem] leading-relaxed text-ink-soft">{HOSTED.p2}</p>
          <span className="mb-7 inline-flex items-center gap-2 self-start rounded-control border border-green-line bg-card px-3 py-1.5 font-mono text-[.85rem] text-ink shadow-soft">
            <span className="live-ring size-1.5 rounded-full bg-green" />
            {HOSTED.url}
            <span className="rounded-chip bg-green px-2 py-0.5 text-[.62rem] font-bold tracking-[0.04em] text-white uppercase">Live</span>
          </span>
          <p className="font-serif text-[1.18rem] text-honey-deep">{HOSTED.aside}</p>
        </Reveal>
      </div>
    </section>
  );
}
