import { Logo } from "@/components/ui/Logo";
import { cx } from "@/lib/cx";

type Tone = "green" | "honey";
type Size = "sm" | "md" | "lg";

const TONES: Record<Tone, string> = {
  green: "text-green-deep border-green-deep",
  honey: "text-honey-deep border-honey-deep",
};

const SIZES: Record<Size, { box: string; text: string; mark: number }> = {
  sm: { box: "size-[76px] border-[3px]", text: "text-[.66rem]", mark: 16 },
  md: { box: "size-[108px] border-[4px]", text: "text-[.86rem]", mark: 22 },
  lg: { box: "size-[150px] border-[5px]", text: "text-[1.15rem]", mark: 34 },
};

/**
 * The letterpress seal. Rests invisible until `down`, then comes down onto the
 * paper: scale 1.7 → 1 with a settle, ink multiplied into the page, and a soft
 * indent ring that spreads and fades. Reduced motion renders it already down.
 *
 * Words are HTML (MOTION.md: no generated pictures carry copy).
 */
export function Stamp({
  children,
  down,
  tone = "green",
  size = "md",
  className,
  mark = true,
}: {
  children: React.ReactNode;
  /** Whether the stamp has landed. */
  down: boolean;
  tone?: Tone;
  size?: Size;
  className?: string;
  /** Show the Allr mark inside the seal. */
  mark?: boolean;
}) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden={!down}
      className={cx("stamp pointer-events-none", down && "stamp--down", className)}
    >
      <span className="stamp__indent" />
      <span
        className={cx(
          "stamp__seal relative flex flex-col items-center justify-center gap-0.5 rounded-full border-solid bg-transparent font-black tracking-[0.18em] uppercase select-none",
          s.box,
          s.text,
          TONES[tone],
        )}
      >
        {mark ? <Logo size={s.mark} className="stamp__mark" /> : null}
        <span className="stamp__word leading-none">{children}</span>
      </span>
    </span>
  );
}
