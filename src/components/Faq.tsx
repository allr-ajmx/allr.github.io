import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";

const ITEMS = [
  {
    q: "What do I get in early access?",
    a: "A workspace that makes finished decks, docs, spreadsheets, videos, sites, apps, and games — then gives them a link. You describe the work. Allr ships it.",
  },
  {
    q: "Do I need five other subscriptions?",
    a: "No. That’s the point. One plan instead of a slides tool, a doc tool, a video tool, a site builder, and an app builder.",
  },
  {
    q: "When can I use it?",
    a: "Leave your email. We’ll write when a spot opens. No credit card to join the list.",
  },
  {
    q: "Is this another chatbot?",
    a: "No. The point was never the file sitting in Downloads. The point is people seeing the work — live.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="section-wash relative pt-5 pb-22">
      <div className="wrap">
        <SectionHead eyebrow="Questions" tone="honey" title="Straight answers." />
        <div className="mx-auto max-w-[720px] divide-y divide-line rounded-card border border-line bg-card/95 shadow-soft">
          {ITEMS.map((item, i) => (
            <Reveal key={item.q} delay={i * 50} className="px-6 py-5 sm:px-7">
              <h3 className="mb-2 text-[1.15rem]">{item.q}</h3>
              <p className="text-[.98rem] text-ink-soft">{item.a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
