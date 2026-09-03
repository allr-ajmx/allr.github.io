import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { APP } from "@/lib/brand";
import { cx } from "@/lib/cx";

type Capability = (typeof APP.inside.capabilities)[number];

const TINTS: Record<Capability["tint"], string> = {
  green: "bg-green-tint text-green-deep",
  honey: "bg-honey-tint text-honey-deep",
  sage: "bg-sage-tint text-green-deep",
  clay: "bg-clay-tint text-honey-deep",
};

const PATHS: Record<Capability["icon"], React.ReactNode> = {
  workspace: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </>
  ),
  spark: (
    <path d="M12 3l2.2 5.5L20 9.6l-4 4 1 5.8-5-2.8-5 2.8 1-5.8-4-4 5.8-1.1z" />
  ),
  puzzle: <path d="M4 8h4V4h8v4h4v8h-4v4H8v-4H4z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  link: (
    <>
      <path d="M5 12h14" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M12 5v14" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
};

export function InsideTheApp() {
  return (
    <section id="inside" className="relative pt-11 pb-28" data-petal="4">
      <div className="wrap relative">
        <SectionHead
          eyebrow={APP.inside.eyebrow}
          tone="green"
          title={APP.inside.title}
        />

        <div className="grid gap-7 min-[561px]:grid-cols-2 min-[861px]:grid-cols-3">
          {APP.inside.capabilities.map((capability, i) => (
            <Reveal
              key={capability.title}
              delay={i * 60}
              className="surface-lift flex flex-col gap-3.5 rounded-card border border-line bg-card p-7 shadow-soft"
            >
              <div
                className={cx(
                  "flex size-11 items-center justify-center rounded-control",
                  TINTS[capability.tint],
                )}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[21px]"
                >
                  {PATHS[capability.icon]}
                </svg>
              </div>
              <h3 className="text-[1.18rem] tracking-[-0.01em] text-balance">
                {capability.title}
              </h3>
              <p className="flex-1 text-[.98rem] leading-relaxed text-pretty text-ink-soft">
                {capability.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
