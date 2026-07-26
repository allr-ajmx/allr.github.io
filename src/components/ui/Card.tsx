import { Reveal } from "@/components/Reveal";
import { cx } from "@/lib/cx";

export type Tint = "green" | "honey" | "sage" | "clay";

const TINTS: Record<Tint, string> = {
  green: "bg-green-tint",
  honey: "bg-honey-tint",
  sage: "bg-sage-tint",
  clay: "bg-clay-tint",
};

export function Card({
  sticker,
  tint,
  title,
  children,
  ready,
  delay = 0,
}: {
  sticker: string;
  tint: Tint;
  title: string;
  children: React.ReactNode;
  /** Optional status pill that turns green once the card is revealed. */
  ready?: string;
  /** Stagger delay in ms for grid entrances. */
  delay?: number;
}) {
  return (
    <Reveal
      delay={delay}
      className="surface-lift flex flex-col gap-3 rounded-card border-[1.5px] border-line bg-card/95 p-7 shadow-soft backdrop-blur-[2px]"
    >
      <div
        className={cx(
          "flex size-[52px] items-center justify-center rounded-2xl text-[1.45rem] transition-transform duration-300 group-data-[reveal=shown]:scale-100",
          TINTS[tint],
        )}
        aria-hidden="true"
      >
        {sticker}
      </div>
      <h3 className="text-[1.22rem]">{title}</h3>
      <p className="flex-1 text-ink-soft">{children}</p>
      {ready ? <ReadyPill>{ready}</ReadyPill> : null}
    </Reveal>
  );
}

function ReadyPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "ready-shimmer relative inline-flex items-center gap-[.5em] self-start overflow-hidden rounded-full border-[1.5px] px-[.95em] py-[.3em] text-[.8rem] font-extrabold",
        "border-line bg-paper text-ink-soft transition-[background-color,border-color,color] duration-500",
        "group-data-[reveal=shown]:border-green-line group-data-[reveal=shown]:bg-green-tint group-data-[reveal=shown]:text-green-deep",
        "before:size-[.55em] before:rounded-full before:bg-honey before:transition-colors before:duration-500 before:content-['']",
        "group-data-[reveal=shown]:before:bg-green",
      )}
    >
      {children}
    </span>
  );
}
