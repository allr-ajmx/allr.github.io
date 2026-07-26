import { Card, type Tint } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";

const AUDIENCES: { sticker: string; tint: Tint; title: string; body: string }[] =
  [
    {
      sticker: "🎸",
      tint: "honey",
      title: "Creators",
      body: "Musicians, writers, artists. Build your site, your promo videos, your press kit — and put them in front of your audience.",
    },
    {
      sticker: "🚀",
      tint: "green",
      title: "Founders & solopreneurs",
      body: "Your pitch deck, your financial model, your landing page, your product demo. One subscription instead of a stack.",
    },
    {
      sticker: "🎓",
      tint: "sage",
      title: "Students & educators",
      body: "Presentations, papers, interactive projects. Finished work, not formatting battles.",
    },
    {
      sticker: "🤝",
      tint: "clay",
      title: "Small teams",
      body: "Everything your team makes, in one place, shareable in one click.",
    },
  ];

export function WhoItsFor() {
  return (
    <section id="who" className="section-wash relative pt-10 pb-22">
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
