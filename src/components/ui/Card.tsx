import { Reveal } from "@/components/Reveal";
import { ArtifactStill } from "@/components/visuals/ArtifactStill";
import { cx } from "@/lib/cx";
import type { ArtifactId } from "@/lib/visuals";

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
  visual,
}: {
  sticker: string;
  tint: Tint;
  title: string;
  children: React.ReactNode;
  /** Optional status chip that turns green once the card is revealed. */
  ready?: string;
  /** Stagger delay in ms for grid entrances. */
  delay?: number;
  visual?: ArtifactId;
}) {
  return (
    <Reveal
      delay={delay}
      className="surface-lift flex flex-col gap-3.5 rounded-card border border-line bg-card/95 p-6 shadow-soft backdrop-blur-[2px]"
    >
      {visual ? (
        <ArtifactStill
          id={visual}
          className="artifact-still--on-reveal mb-0.5"
          sizes="(max-width: 560px) 90vw, (max-width: 860px) 45vw, 320px"
        />
      ) : (
        <div
          className={cx(
            "flex size-11 items-center justify-center rounded-control text-[1.35rem]",
            TINTS[tint],
          )}
          aria-hidden="true"
        >
          {sticker}
        </div>
      )}
      <h3 className="text-[1.18rem] tracking-[-0.01em]">{title}</h3>
      <p className="flex-1 text-[.98rem] leading-relaxed text-ink-soft">
        {children}
      </p>
      {ready ? <ReadyPill>{ready}</ReadyPill> : null}
    </Reveal>
  );
}

function ReadyPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "ready-shimmer relative inline-flex items-center gap-1.5 self-start overflow-hidden rounded-chip border px-2.5 py-1 text-[.75rem] font-bold tracking-[0.03em] uppercase",
        "border-line bg-paper text-ink-soft transition-[background-color,border-color,color] duration-500",
        "group-data-[reveal=shown]:border-green-line group-data-[reveal=shown]:bg-green-tint group-data-[reveal=shown]:text-green-deep",
        "before:size-1.5 before:rounded-full before:bg-honey before:transition-colors before:duration-500 before:content-['']",
        "group-data-[reveal=shown]:before:bg-green",
      )}
    >
      {children}
    </span>
  );
}
