"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

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
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // Without IntersectionObserver the `js` flag is never set, so the hidden
    // state never applies and there is nothing to reveal.
    if (!el || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={shown ? "shown" : "hidden"}
      className={cx("group", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
