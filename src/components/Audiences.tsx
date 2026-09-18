import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { SectionHead } from "@/components/ui/SectionHead";
import { AUDIENCES } from "@/lib/brand";
import { rotationToPoint } from "@/lib/petals";

const AUDIENCE_PETALS = [0, 1, 4, 2] as const;

/**
 * Audiences — Who Uses Allr (Act IV of Master Story).
 * 4 core groups: AI product builders, product teams, agencies & consultancies, business operators.
 */
export function Audiences() {
  return (
    <section id="audiences" className="relative pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="wrap relative">
        <SectionHead
          eyebrow="Act IV · Audience Relevance"
          title="Built for those who turn capability into operation."
        >
          Useful intent exists everywhere. The hard part is turning it into a dependable operation.
          Allr provides the execution, product, and intelligence harness around the work.
        </SectionHead>

        <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
          {AUDIENCES.map((aud, i) => {
            const petalIdx = AUDIENCE_PETALS[i] ?? 0;
            const angle = rotationToPoint(petalIdx, -90);
            return (
              <Reveal
                key={aud.id}
                delay={i * 70}
                className="flex flex-col justify-between rounded-panel border border-line bg-card p-6 sm:p-8 shadow-soft hover:shadow-lift transition-all duration-300"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[1.5rem]" aria-hidden="true">
                      {aud.sticker}
                    </span>
                    <AllrMark size={20} highlight={petalIdx} rotate={angle} />
                  </div>

                  <h3 className="mb-2 font-serif text-[1.25rem] text-ink">
                    {aud.title}
                  </h3>
                  <p className="text-[.95rem] leading-relaxed text-ink-soft">
                    {aud.body}
                  </p>
                </div>

                <div className="mt-6 border-t border-line-soft pt-4 text-[.82rem] font-bold text-honey-deep">
                  Same barrier. Different work.
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
