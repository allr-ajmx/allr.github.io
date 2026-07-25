import { cx } from "@/lib/cx";

type Variant = "green" | "ghost" | "white";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-transparent font-extrabold no-underline cursor-pointer " +
  "transition-[transform,box-shadow,background-color,border-color] duration-150 hover:-translate-y-0.5 active:translate-y-0";

const VARIANTS: Record<Variant, string> = {
  green:
    "bg-green text-white shadow-[0_10px_24px_rgba(46,158,99,.30)] hover:bg-green-deep",
  ghost: "bg-card border-line text-ink hover:border-[#D8CFBB]",
  white: "bg-white text-green-deep hover:bg-green-tint",
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
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={cx(BASE, VARIANTS[variant], SIZES[size], className)}
    >
      {children}
    </a>
  );
}
