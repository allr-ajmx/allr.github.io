import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";

const HANDLED = [
  "Hosting",
  "Formatting",
  "Design systems",
  "Working formulas",
  "Video rendering",
  "Deployment",
  "File formats",
  "Share links",
];

export function Solution() {
  return (
    <section id="solution" className="relative pt-5 pb-22">
      <div className="wrap">
        <SectionHead
          eyebrow="The solution"
          tone="green"
          title="One workspace. Every kind of work. Actually finished."
        />

        <Reveal className="prose-block" delay={60}>
          <p>
            Allr — as in <strong>all</strong> — puts everything under one roof.
            You describe what you want in plain language. Allr picks the right
            tools, generates the asset, and keeps everything in one project.
          </p>
          <p>
            No juggling subscriptions. No passing context between apps. No
            half-finished exports sitting in a downloads folder.
          </p>
        </Reveal>

        {/* The mentor's job: quietly removing the technical stuff */}
        <Reveal
          className="surface-lift mx-auto mt-13 max-w-[860px] rounded-panel border border-line bg-card/95 px-7 py-10 text-center shadow-soft backdrop-blur-[2px] sm:px-8"
          delay={120}
          variant="scale"
        >
          <h3 className="mb-2 text-[1.3rem] tracking-[-0.01em]">
            The technical stuff? Already handled.
          </h3>
          <p className="mb-6 text-[1.02rem] text-ink-soft">
            All the things that usually stand between you and
            &ldquo;it&rsquo;s done&rdquo; — Allr takes care of them quietly, in
            the background.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {HANDLED.map((chip, i) => (
              <span
                key={chip}
                className="stagger-child inline-flex items-center gap-1.5 rounded-chip border border-sage-line bg-sage-tint px-3 py-1.5 text-[.85rem] font-semibold text-ink after:text-green-deep after:content-['✓']"
                style={{ ["--i" as string]: i, ["--stagger-base" as string]: "45ms" }}
              >
                {chip}
              </span>
            ))}
          </div>
          <p className="mt-[22px] font-serif text-[1.05rem] text-honey-deep">
            You focus on the work. Allr handles the rest.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
