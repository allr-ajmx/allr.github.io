import { HostingScene } from "@/components/HostingScene";
import { Reveal } from "@/components/Reveal";
import { Pill } from "@/components/ui/Pill";
import { HOSTED } from "@/lib/brand";

/** Left: the words. Right: petals as servers, sending the work to real devices. */
export function PublishingBand() {
  return (
    <section id="publish" className="relative pt-10 pb-22">
      <div className="wrap grid items-center gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
        <Reveal className="max-w-[34rem]">
          <Pill tone="green" className="mb-[18px]">{HOSTED.eyebrow}</Pill>
          <h2 className="mb-[18px] text-[clamp(1.7rem,3.2vw,2.3rem)]">{HOSTED.title}</h2>
          <p className="mb-4 text-[1.02rem] leading-relaxed text-ink-soft">{HOSTED.p1}</p>
          <p className="mb-6 text-[1.02rem] leading-relaxed text-ink-soft">{HOSTED.p2}</p>
          <span className="mb-7 inline-flex items-center gap-2 rounded-control border border-green-line bg-card px-3 py-1.5 font-mono text-[.85rem] text-ink shadow-soft">
            <span className="live-ring size-1.5 rounded-full bg-green" />
            {HOSTED.url}
            <span className="rounded-chip bg-green px-2 py-0.5 text-[.62rem] font-bold tracking-[0.04em] text-white uppercase">Live</span>
          </span>
          <p className="font-serif text-[1.18rem] text-honey-deep">{HOSTED.aside}</p>
        </Reveal>
        <Reveal variant="scale" className="overflow-x-auto">
          <div className="min-w-[520px]">
            <HostingScene />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
