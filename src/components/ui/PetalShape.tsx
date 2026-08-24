import { PETAL_PATH } from "@/lib/petals";
import { cx } from "@/lib/cx";

/**
 * A single petal, as a shape. Fills its box (natural aspect 1.46:1, pointing
 * up); rotate with `rotate`. Colour via `color` (any CSS colour).
 */
export function PetalShape({
  color,
  rotate = 0,
  className,
  style,
}: {
  color: string;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cx("petal block", className)}
      style={{ color, transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
    >
      <path d={PETAL_PATH} fill="currentColor" />
    </svg>
  );
}
