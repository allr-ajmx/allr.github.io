import { cx } from "@/lib/cx";

type Variant = "green" | "ghost" | "white";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-transparent font-extrabold no-underline";

const INTERACTIVE =
  "cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150 hover:-translate-y-0.5 active:translate-y-0";

const VARIANTS: Record<Variant, { base: string; hover: string }> = {
  green: {
    base: "bg-green text-white shadow-[0_10px_24px_rgba(46,158,99,.30)]",
    hover: "hover:bg-green-deep",
  },
  ghost: {
    base: "bg-card border-line text-ink",
    hover: "hover:border-[#D8CFBB]",
  },
  white: {
    base: "bg-white text-green-deep",
    hover: "hover:bg-green-tint",
  },
};

const SIZES: Record<Size, string> = {
  sm: "text-base px-[1.4em] py-[.6em]",
  md: "text-base px-[1.8em] py-[.85em]",
  lg: "text-[1.1rem] px-[2.1em] py-[1em]",
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
