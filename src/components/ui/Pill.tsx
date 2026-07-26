import { cx } from "@/lib/cx";

type Tone = "neutral" | "green" | "honey";

const TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "border-line bg-card text-ink-soft", dot: "bg-honey" },
  green: {
    pill: "border-green-line bg-green-tint text-green-deep",
    dot: "bg-green",
  },
  honey: {
    pill: "border-honey-line bg-honey-tint text-honey-deep",
    dot: "bg-honey",
  },
};

/** The small label chip used as a section eyebrow. */
export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  const { pill, dot } = TONES[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-chip border px-3 py-1.5 text-[.8rem] font-bold tracking-[0.04em] uppercase",
        pill,
        className,
      )}
    >
      <span
        className={cx("size-1.5 shrink-0 rounded-full", dot)}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
