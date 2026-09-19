import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { GAP } from "@/lib/brand";

/**
 * Gap — The AI Paradox & The Repeated Infrastructure Tax (Act I of Master Story).
 * Two-column on desktop: narrative essay left, visual comparison placeholder right.
 */
export function Gap() {
  return (
    <section id="gap" className="relative pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* Left Narrative Column */}
        <div className="min-w-0 text-left">
          <Reveal className="mb-6 max-w-[620px]" variant="up">
            <span className="mb-3 inline-flex items-center gap-2 rounded-chip bg-honey-tint px-3 py-1 font-mono text-[.75rem] font-bold text-honey-deep uppercase tracking-wider">
              <AllrMark size={14} highlight={1} />
              Act I · The Paradox
            </span>
            <h2 className="font-serif text-[clamp(1.85rem,3.4vw,2.55rem)] leading-[1.15] text-ink">
              {GAP.title}
            </h2>
          </Reveal>

          <Reveal
            className="prose-block max-w-[620px] [margin-inline:0] text-[1.05rem] leading-relaxed text-ink-soft space-y-4"
            delay={80}
          >
            <p>{GAP.p1}</p>
            <p>{GAP.p2}</p>
            <p className="border-l-2 border-honey-line pl-4 text-ink font-medium">
              {GAP.agitation}
            </p>
            <p className="text-ink font-serif text-[1.15rem] pt-2">
              <strong>{GAP.close}</strong>
            </p>
          </Reveal>
        </div>

        {/* Right Visual Comparison Card */}
        <Reveal className="w-full min-w-0" delay={120}>
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-panel border border-line bg-card shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/placeholders/gap-terminals.png"
                alt="Multiple floating terminals running coordinated AI agents"
                className="block h-auto w-full object-cover"
              />
            </div>

            {/* Quick architectural contrast strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-card border border-line-soft bg-paper/60 p-3.5 text-[.82rem]">
                <p className="font-bold text-ink-soft mb-1 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-honey" />
                  The Fragmented Stack
                </p>
                <p className="text-ink-soft">
                  Chat prompts, isolated code sandboxes, manual auth, hand-stitched Stripe rails, and zero maintenance.
                </p>
              </div>

              <div className="rounded-card border border-green-line bg-green-tint/30 p-3.5 text-[.82rem]">
                <p className="font-bold text-green-deep mb-1 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-green" />
                  The Allr Workspace
                </p>
                <p className="text-ink">
                  Journeys, state, background intelligence, and continuous health unified under one persistent roof.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
