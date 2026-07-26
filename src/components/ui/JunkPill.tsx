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
        "inline-flex items-center gap-2 rounded-control border border-line bg-card px-3.5 py-2 text-[.88rem] font-semibold text-ink-soft shadow-soft",
        tilt === "left" && "-rotate-1",
        tilt === "right" && "rotate-1",
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-[#DFA4A4]" /> : null}
      {children}
    </span>
  );
}

/** The single green "and this replaces all of it" chip. */
export function OnePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-control border border-green-line bg-green-tint px-5 py-3 font-serif text-[1.15rem] text-green-deep shadow-[0_12px_28px_rgba(46,158,99,.16)]">
      <span className="size-2 rounded-full bg-green" />
      {children}
    </span>
  );
}
