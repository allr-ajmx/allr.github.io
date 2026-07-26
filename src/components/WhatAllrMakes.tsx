import { Reveal } from "@/components/Reveal";
import { Card, type Tint } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";

const MAKES: {
  sticker: string;
  tint: Tint;
  title: string;
  body: string;
  ready: string;
}[] = [
  {
    sticker: "📊",
    tint: "honey",
    title: "Decks",
    body: "Pitch decks, sales decks, class presentations. Structured, designed, ready to present.",
    ready: "ready",
  },
  {
    sticker: "📄",
    tint: "sage",
    title: "Docs",
    body: "Reports, proposals, essays, one-pagers. Written and formatted, not just drafted.",
    ready: "ready",
  },
  {
    sticker: "🧮",
    tint: "green",
    title: "Spreadsheets",
    body: "Models, trackers, budgets. With working formulas, not just tables.",
    ready: "ready",
  },
  {
    sticker: "🎬",
    tint: "clay",
    title: "Videos & animations",
    body: "Explainers, promos, social clips. Generated, not storyboarded-and-abandoned.",
    ready: "ready",
  },
  {
    sticker: "🌐",
    tint: "green",
    title: "Websites",
    body: "Portfolios, landing pages, full sites. Live on the internet, not stuck in a builder.",
    ready: "live",
  },
  {
    sticker: "🕹️",
    tint: "honey",
    title: "Apps & games",
    body: "Working software from a description. The thing itself, not a prototype of the thing.",
    ready: "live",
  },
];

export function WhatAllrMakes() {
  return (
    <section id="makes" className="section-wash relative pt-5 pb-22">
      <div className="wrap relative">
        <SectionHead
          eyebrow="What Allr makes"
          tone="honey"
          title="From documents to software."
        />

        <div className="grid grid-cols-1 gap-5 min-[561px]:grid-cols-2 min-[861px]:grid-cols-3">
          {MAKES.map((item, i) => (
            <Card
              key={item.title}
              sticker={item.sticker}
              tint={item.tint}
              title={item.title}
              ready={item.ready}
              delay={i * 70}
            >
              {item.body}
            </Card>
          ))}
        </div>

        <Reveal
          className="mx-auto mt-[42px] max-w-[700px] rounded-card border border-dashed border-[#E3D6BC] bg-card/90 px-7 py-5 text-center text-[1.02rem] text-ink-soft shadow-soft backdrop-blur-[2px]"
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
