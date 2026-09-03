import { Reveal } from "@/components/Reveal";
import { APP } from "@/lib/brand";

/** The one place on this page that says "not finished yet". */
export function Growing() {
  return (
    <section className="pt-0 pb-28" data-petal="1">
      <div className="wrap">
        <Reveal variant="up" className="relative px-8 py-8 text-center">
          <div className="relative mx-auto max-w-[700px]">
            <h2 className="mb-5 text-[clamp(1.9rem,3.6vw,2.6rem)] text-balance">
              {APP.growing.title}
            </h2>
            <p className="text-[1.08rem] text-pretty text-ink-soft">
              {APP.growing.body}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
