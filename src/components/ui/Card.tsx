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
}: {
  sticker: string;
  tint: Tint;
  title: string;
  children: React.ReactNode;
  /** Optional status pill that turns green once the card is revealed. */
  ready?: string;
}) {
  return (
    <Reveal className="flex flex-col gap-3 rounded-card border-[1.5px] border-line bg-card p-7 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div
        className={cx(
          "flex size-[52px] items-center justify-center rounded-2xl text-[1.45rem]",
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
        "inline-flex items-center gap-[.5em] self-start rounded-full border-[1.5px] px-[.95em] py-[.3em] text-[.8rem] font-extrabold",
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
