import { Reveal } from "@/components/Reveal";
import { PROMISE } from "@/lib/brand";

/**
 * Quiet promise — demoted into Resolve (LANDING_PAGE_STORY §7.9).
 * One centered serif line; generous padding. Not a mid-page climax.
 */
export function AllrPromise() {
  return (
    <section className="relative py-16 sm:py-20" aria-label="Allr promise">
      <div className="wrap relative">
        <Reveal
          className="mx-auto max-w-[640px] px-4 text-center"
          variant="wipe"
        >
          <p className="font-serif text-[clamp(1.25rem,2.6vw,1.65rem)] leading-[1.45] text-ink">
            {PROMISE}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
