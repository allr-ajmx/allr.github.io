import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { AUDIENCES } from "@/lib/brand";

export function WhoItsFor() {
  return (
    <section id="who" className="relative pt-10 pb-22">
      <div className="wrap relative">
        <SectionHead
          eyebrow="Who it's for"
          tone="honey"
          title="Built for people with things to ship."
        />

        <div className="grid grid-cols-1 gap-5 min-[561px]:grid-cols-2">
          {AUDIENCES.map((item, i) => (
            <Card
              key={item.title}
              sticker={item.sticker}
              tint={item.tint}
              title={item.title}
              delay={i * 80}
            >
              {item.body}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
