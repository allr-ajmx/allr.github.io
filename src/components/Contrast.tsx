import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { SectionHead } from "@/components/ui/SectionHead";
import { CONTRAST } from "@/lib/brand";

/**
 * Contrast — Why Existing Tools Leave the Gap Open (Act VIII of Master Story).
 * Mentor diagnosis comparing Ephemeral Chat, Point Builders, Raw Cloud, and Allr.
 */
export function Contrast() {
  return (
    <section id="contrast" className="relative pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="wrap relative">
        <SectionHead
          eyebrow="Act VIII · Category Contrast"
          title={CONTRAST.title}
        >
          {CONTRAST.sub}
        </SectionHead>

        <Reveal className="mx-auto max-w-[800px]" delay={60}>
          <div className="overflow-hidden rounded-panel border border-line bg-card shadow-soft">
            <ul className="divide-y divide-line-soft">
              {CONTRAST.rows.map((row) => (
                <li
                  key={row.id}
                  className="grid gap-2 p-6 sm:grid-cols-[13rem_1fr] sm:gap-6 hover:bg-paper/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-honey" />
                    <h3 className="font-serif text-[1.1rem] text-ink">
                      {row.label}
                    </h3>
                  </div>
                  <p className="text-[.95rem] leading-relaxed text-ink-soft">
                    {row.body}
                  </p>
                </li>
              ))}

              {/* Allr Contender Row */}
              <li className="grid gap-2 border-t-2 border-green-line bg-green-tint/30 p-6 sm:grid-cols-[13rem_1fr] sm:gap-6">
                <div className="flex items-center gap-2.5">
                  <AllrMark size={20} highlight={4} />
                  <h3 className="font-serif text-[1.15rem] font-bold text-green-deep">
                    Allr Workspace
                  </h3>
                </div>
                <p className="text-[.95rem] font-medium leading-relaxed text-ink">
                  {CONTRAST.close}
                </p>
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
