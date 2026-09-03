"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { cx } from "@/lib/cx";
import { gsap, ScrollTrigger } from "@/lib/motion";

/**
 * Moves its children a fraction of the distance they scroll, relative to the
 * centre of the viewport. `speed` 0.1 = drifts 10% of scroll (slower than the
 * page — feels further away); negative = faster than the page.
 *
 * The outer element stays in normal flow and is what ScrollTrigger watches;
 * only the inner element is transformed, so the motion can never push the
 * thing being observed out of view. Offset is clamped, transform only, and off
 * under reduced motion.
 */
export function Parallax({
  speed = 0.1,
  className,
  children,
  style,
  as: Tag = "div",
}: {
  speed?: number;
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  as?: "div" | "span";
}) {
  const outer = useRef<HTMLDivElement & HTMLSpanElement>(null);
  const inner = useRef<HTMLDivElement & HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = outer.current;
      const target = inner.current;
      if (!el || !target) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The old rAF loop mapped the element's distance from the viewport
        // centre (clamped to +/-1.6) onto a translate. ScrollTrigger gives the
        // same ramp for free: at `start` the element is entering from the
        // bottom, at `end` it is leaving past the top.
        const reach = () => window.innerHeight * 0.5 * speed * 1.6;
        const st = gsap.fromTo(
          target,
          { y: () => reach() },
          {
            y: () => -reach(),
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
        return () => {
          st.scrollTrigger?.kill();
          st.kill();
          gsap.set(target, { clearProps: "transform" });
        };
      });

      // A late-loading image or font changes where everything sits.
      ScrollTrigger.refresh();
      return () => mm.revert();
    },
    { scope: outer, dependencies: [speed] },
  );

  return (
    <Tag ref={outer} className={className} style={style}>
      <Tag ref={inner} className={cx("will-change-transform", Tag === "span" && "inline-block")}>
        {children}
      </Tag>
    </Tag>
  );
}
