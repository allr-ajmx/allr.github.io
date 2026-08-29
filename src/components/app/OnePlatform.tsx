import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { SectionHead } from "@/components/ui/SectionHead";
import { APP } from "@/lib/brand";
import { cx } from "@/lib/cx";

/** The legend defines the three states; a module carries one of them. */
type Status = (typeof APP.one.legend)[number]["status"];

/** Colour carries the state, so a tile reads before it is read. */
const TILE: Record<Status, string> = {
  planned: "border-line bg-white/55 text-ink-soft",
  progress: "border-honey-line bg-honey-tint text-honey-deep",
  working: "border-green-line bg-green-tint text-green-deep",
};

const DOT: Record<Status, string> = {
  planned: "bg-ink-soft/40",
  progress: "bg-honey",
  working: "bg-green",
};

/**
 * The argument the whole page rests on: many separate pieces of software on one
 * side, one app on the other.
 */
export function OnePlatform() {
  return (
    <section id="one" className="section-wash relative pt-11 pb-28" data-petal="0">
      <div className="wrap relative">
        <SectionHead eyebrow={APP.one.eyebrow} title={APP.one.title}>
          {APP.one.body}
        </SectionHead>

        <div className="grid items-center gap-12 lg:grid-cols-[1.24fr_auto_0.92fr] lg:gap-10">
          <Reveal variant="left" className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-2.5 min-[421px]:grid-cols-2">
              {APP.one.modules.map((module, i) => (
                <div
                  key={module.name}
                  className={cx(
                    "stagger-child flex items-center gap-2.5 rounded-[12px] border px-3.5 py-3 text-[.92rem] font-semibold text-balance",
                    TILE[module.status],
                  )}
                  style={{ ["--i" as string]: i }}
                >
                  <span
                    className={cx(
                      "size-1.5 shrink-0 rounded-full",
                      DOT[module.status],
                    )}
                    aria-hidden="true"
                  />
                  {module.name}
                </div>
              ))}
            </div>

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[.88rem] text-ink-soft">
              {APP.one.legend.map((entry) => (
                <li key={entry.status} className="flex items-center gap-2">
                  <span
                    className={cx(
                      "size-1.5 shrink-0 rounded-full",
                      DOT[entry.status],
                    )}
                    aria-hidden="true"
                  />
                  {entry.label}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal variant="fade" delay={160} className="flex justify-center">
            <ArrowIcon />
          </Reveal>

          <Reveal
            variant="right"
            delay={80}
            className="flex flex-col items-center gap-4 rounded-panel border border-green-line bg-[linear-gradient(155deg,#FFFFFF,var(--color-green-tint))] px-9 py-11 text-center shadow-lift"
          >
            <AllrMark size={62} bloom />
            <h3 className="text-[1.6rem]">{APP.one.card.title}</h3>
            <p className="text-[1rem] text-ink-soft">{APP.one.card.body}</p>
            <p className="text-[.95rem] text-ink-soft">
              {APP.one.card.platforms}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-10 rotate-90 text-honey lg:rotate-0"
      aria-hidden="true"
    >
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
