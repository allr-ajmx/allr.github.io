import { Reveal } from "@/components/Reveal";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { OUTPUTS } from "@/lib/brand";

export function WhatAllrMakes() {
  return (
    <section id="makes" className="relative pt-5 pb-22">
      <div className="wrap relative">
        <SectionHead
          eyebrow="What Allr makes"
          tone="honey"
          title="From documents to software."
        />

        <div className="grid grid-cols-1 gap-5 min-[561px]:grid-cols-2 min-[861px]:grid-cols-3">
          {OUTPUTS.map((item, i) => (
            <Card
              key={item.title}
              sticker={item.sticker}
              tint={item.tint}
              title={item.title}
              ready={item.ready}
              visual={item.id}
              delay={i * 70}
            >
              {item.body}
            </Card>
          ))}
        </div>

        <Reveal
          className="mx-auto mt-[42px] max-w-[700px] rounded-card border border-dashed border-[#E3D6BC] bg-card px-7 py-5 text-center text-[1.02rem] text-ink-soft shadow-soft"
          delay={100}
        >
          Every asset lives in your project, next to everything else
          you&rsquo;ve made. Your deck can reference your spreadsheet. Your
          website can embed your video.{" "}
          <strong className="text-ink">
            It&rsquo;s one body of work, not six exports.
          </strong>
        </Reveal>
      </div>
    </section>
  );
}
