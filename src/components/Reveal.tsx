"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

export type RevealVariant = "up" | "fade" | "scale" | "left" | "right" | "blur" | "wipe";

/**
 * Fades its content up the first time it scrolls into view.
 *
 * It renders as the element itself (rather than wrapping one) so it can be
 * dropped into a grid without adding a layout box. The `group` class plus the
 * `data-reveal` attribute let descendants react to the reveal too — that is how
 * the "ready" pills on the cards flip from honey to green.
 */
export function Reveal({
  className,
  children,
  delay = 0,
  variant = "up",
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Extra wait (ms) after entering the viewport — use for staggered grids. */
  delay?: number;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Without IntersectionObserver the `js` flag is never set, so the hidden
    // state never applies and there is nothing to reveal.
    if (!el || !("IntersectionObserver" in window)) return;

    // Eager reveal while scrolling: fire as soon as any pixel enters an
    // expanded viewport band. (Old threshold + negative bottom rootMargin
    // waited until the block was deep in view — felt like "only after I stop".)
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setShown(true);
            io.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0,
        rootMargin: "0px 0px 25% 0px",
      },
    );

    io.observe(el);

    // Already on-screen at mount (above-the-fold / fast restore) — don't wait
    // for a scroll event that may never come.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    if (rect.top < vh * 1.25 && rect.bottom > -vh * 0.1) {
      setShown(true);
      io.unobserve(el);
    }

    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      data-reveal-variant={variant}
      className={cx("group", className)}
      style={{
        ...style,
        ["--reveal-delay" as string]: `${delay}ms`,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
