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

/** The small label pill used as a section eyebrow. */
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
        "inline-flex items-center gap-[.55em] rounded-full border-[1.5px] px-[1.1em] py-[.4em] text-[.85rem] font-extrabold tracking-[.02em]",
        pill,
        className,
      )}
    >
      <span
        className={cx("size-[.55em] shrink-0 rounded-full", dot)}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
