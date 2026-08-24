import { HostingScene } from "@/components/HostingScene";
import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { HOSTED } from "@/lib/brand";

/** No box: the hosting scene sits straight on the paper, full width. */
export function PublishingBand() {
  return (
    <section id="publish" className="relative pt-10 pb-22">
      <div className="wrap">
        <SectionHead eyebrow={HOSTED.eyebrow} tone="green" title={HOSTED.title}>
          {HOSTED.p1}
        </SectionHead>

        <Reveal variant="scale" className="overflow-x-auto">
          <div className="min-w-[760px]">
            <HostingScene />
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-[640px] text-center" delay={80}>
          <p className="mb-3 text-[1.02rem] text-ink-soft">{HOSTED.p2}</p>
          <p className="font-serif text-[1.18rem] text-honey-deep">{HOSTED.aside}</p>
        </Reveal>
      </div>
    </section>
  );
}
