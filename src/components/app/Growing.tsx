import { Reveal } from "@/components/Reveal";
import { APP } from "@/lib/brand";

/** The honey band: the one place on this page that says "not finished yet". */
export function Growing() {
  return (
    <section className="pt-0 pb-28" data-petal="1">
      <div className="wrap">
        <Reveal
          variant="scale"
          className="relative overflow-hidden rounded-panel border border-honey-line bg-[linear-gradient(150deg,#FDF3DF,var(--color-honey-tint)_55%,#F3ECDC)] px-8 py-20 text-center shadow-soft"
        >
          <span
            aria-hidden="true"
            className="band-blob pointer-events-none absolute -top-15 -right-10 size-70 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.55),transparent_65%)]"
          />
          <span
            aria-hidden="true"
            className="band-blob band-blob--slow pointer-events-none absolute -bottom-20 -left-8 size-60 rounded-full bg-[radial-gradient(circle,rgba(46,158,99,.10),transparent_65%)]"
          />
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
