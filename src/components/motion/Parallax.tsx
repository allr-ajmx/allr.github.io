"use client";

import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";

/**
 * Moves its children a fraction of the distance they scroll, relative to the
 * centre of the viewport. `speed` 0.1 = drifts 10% of scroll (slower than the
 * page — feels further away); negative = faster than the page.
 *
 * The outer element stays in normal flow and is what the observer watches;
 * only the inner element is transformed, so the motion can never push the
 * thing being observed out of view. Offset is clamped, transform only, one
 * rAF per frame, only while on screen, off under reduced motion.
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

  useEffect(() => {
    const el = outer.current;
    const target = inner.current;
    if (!el || !target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = false;
    let frame = 0;

    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1 at bottom of viewport … +1 at top; 0 at centre. Clamped so an
      // element far off-screen never gets a wild offset.
      const raw = (r.top + r.height / 2 - vh / 2) / (vh / 2);
      const t = Math.max(-1.6, Math.min(1.6, raw));
      target.style.transform = `translate3d(0, ${(-t * speed * vh * 0.5).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!visible || frame) return;
      frame = window.requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible) onScroll();
      },
      { rootMargin: "30% 0px 30% 0px" },
    );
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [speed]);

  return (
    <Tag ref={outer} className={className} style={style}>
      <Tag ref={inner} className={cx("will-change-transform", Tag === "span" && "inline-block")}>
        {children}
      </Tag>
    </Tag>
  );
}
