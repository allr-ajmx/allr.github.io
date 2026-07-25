import { cx } from "@/lib/cx";

/** A struck-through "yet another subscription" chip. */
export function JunkPill({
  dot = false,
  tilt,
  children,
}: {
  dot?: boolean;
  tilt?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-[.6em] rounded-full border-[1.5px] border-line bg-card px-[1.2em] py-[.45em] text-[.9rem] font-extrabold text-ink-soft shadow-soft",
        tilt === "left" && "-rotate-2",
        tilt === "right" && "rotate-2",
      )}
    >
      {dot ? <span className="size-[.55em] rounded-full bg-[#DFA4A4]" /> : null}
      {children}
    </span>
  );
}

/** The single green "and this replaces all of it" chip. */
export function OnePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex -rotate-1 items-center gap-[.7em] rounded-full border-[1.5px] border-green-line bg-green-tint px-[1.6em] py-[.7em] font-serif text-[1.2rem] text-green-deep shadow-[0_16px_36px_rgba(46,158,99,.18)]">
      <span className="size-[.6em] rounded-full bg-green" />
      {children}
    </span>
  );
}
