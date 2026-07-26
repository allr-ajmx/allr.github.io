import { cx } from "@/lib/cx";

type Variant = "green" | "ghost" | "white";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control border border-transparent font-bold tracking-[-0.01em] no-underline";

const INTERACTIVE =
  "cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150 hover:-translate-y-0.5 active:translate-y-0";

const VARIANTS: Record<Variant, { base: string; hover: string }> = {
  green: {
    base: "bg-green text-white shadow-[0_8px_20px_rgba(46,158,99,.28)]",
    hover: "hover:bg-green-deep",
  },
  ghost: {
    base: "bg-card border-line text-ink",
    hover: "hover:border-[#D8CFBB] hover:bg-paper",
  },
  white: {
    base: "bg-white text-green-deep shadow-[0_8px_20px_rgba(0,0,0,.08)]",
    hover: "hover:bg-green-tint",
  },
};

const SIZES: Record<Size, string> = {
  sm: "text-[.92rem] px-4 py-2",
  md: "text-[.98rem] px-5 py-2.5",
  lg: "text-[1.05rem] px-6 py-3",
};

export function Button({
  href,
  variant = "green",
  size = "md",
  className,
  children,
}: {
  /**
   * Omit to render the button as an inert badge — same shape and colour, but
   * no link, no pointer and no hover response. Used for "Coming soon", which
   * is a status rather than something to click.
   */
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  const tone = VARIANTS[variant];
  const classes = cx(
    BASE,
    tone.base,
    SIZES[size],
    href && INTERACTIVE,
    href && tone.hover,
    className,
  );

  if (!href) {
    return <span className={classes}>{children}</span>;
  }

  return (
    <a href={href} className={classes}>
      {children}
    </a>
  );
}
