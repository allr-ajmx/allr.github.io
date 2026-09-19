import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { FAQ } from "@/lib/brand";

/**
 * FAQ — last objections before the close (LANDING_PAGE_STORY §7.9).
 * All five questions from brand. Quiet WordPress analogy at the end only.
 */
export function Faq() {
  return (
    <section id="faq" className="relative pt-5 pb-22">
      <div className="wrap relative">
        <SectionHead title="Straight answers." />

        <Reveal className="mx-auto max-w-[720px]" delay={60}>
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {FAQ.map((item) => (
              <li key={item.q} className="stagger-child py-5">
                <h3 className="mb-2 text-[1.08rem] tracking-[-0.01em]">
                  {item.q}
                </h3>
                <p className="text-[.98rem] leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-[520px] text-center" delay={120}>
          <p className="text-[.92rem] font-bold leading-snug text-honey-deep">
            WordPress standardized publishing infrastructure. Allr aims to
            standardize the operating layer under AI-enabled products.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
