import Image from "next/image";

/**
 * The Allr mark. Renders the SVG from /public as-is rather than inlining it, so
 * edits to logo_base.svg flow straight through to every usage. `unoptimized`
 * because there is nothing for the image optimizer to do to an SVG.
 */
export function Logo({
  size,
  className,
  priority = false,
}: {
  size: number;
  className?: string;
  /** Set on the above-the-fold header mark so it is not lazy-loaded. */
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo_base.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
