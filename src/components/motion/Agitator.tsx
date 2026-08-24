"use client";

import { useEffect, useRef } from "react";

const PUSH_RADIUS = 110; // px around the pointer
const PUSH_MAX = 9; // px of displacement at the pointer

/**
 * Makes the web react. Scrolling raises `--agi` on the scene (wobble
 * amplitude scales with it) and it decays back to calm; the pointer nudges
 * petals within a small radius away from it, very slightly. One rAF loop,
 * only while there is something to do; nothing under reduced motion.
 */
export function Agitator() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".hosting");
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const motes = Array.from(root.querySelectorAll<SVGGElement>(".hosting__push"));
    const svg = root.querySelector("svg");

    // Off-screen, the web costs nothing: SMIL and CSS both pause.
    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        root.classList.toggle("hosting--paused", !on);
        if (svg) (on ? svg.unpauseAnimations : svg.pauseAnimations).call(svg);
      },
      { rootMargin: "10% 0px 10% 0px" },
    );
    io.observe(root);
    let agi = 0;
    let lastY = window.scrollY;
    let frame = 0;
    let inside = false;
    let px = 0;
    let py = 0;
    const pushed = new Set<SVGGElement>();
    // Positions are re-read every few frames; petals drift slowly enough.
    let rects: DOMRect[] = [];
    let readIn = 0;

    const tick = () => {
      frame = 0;
      // agitation decays toward calm
      if (agi > 0.005) {
        agi *= 0.92;
        root.style.setProperty("--agi", agi.toFixed(3));
      } else if (agi !== 0) {
        agi = 0;
        root.style.removeProperty("--agi");
      }

      if (inside) {
        // Read every position first, then write — one layout per frame, not
        // one per petal.
        if (readIn <= 0 || rects.length !== motes.length) {
          rects = motes.map((m) => m.getBoundingClientRect());
          readIn = 3;
        }
        readIn--;
        for (let i = 0; i < motes.length; i++) {
          const m = motes[i];
          const r = rects[i];
          const dx = r.left + r.width / 2 - px;
          const dy = r.top + r.height / 2 - py;
          const d = Math.hypot(dx, dy);
          if (d < PUSH_RADIUS) {
            const f = (1 - d / PUSH_RADIUS) ** 2 * PUSH_MAX;
            m.style.setProperty("--push-x", `${((dx / (d || 1)) * f).toFixed(1)}px`);
            m.style.setProperty("--push-y", `${((dy / (d || 1)) * f).toFixed(1)}px`);
            pushed.add(m);
          } else if (pushed.has(m)) {
            m.style.removeProperty("--push-x");
            m.style.removeProperty("--push-y");
            pushed.delete(m);
          }
        }
      }
      if (agi > 0 || inside) frame = window.requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const y = window.scrollY;
      agi = Math.min(1, agi + Math.abs(y - lastY) / 500);
      lastY = y;
      schedule();
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      inside = true;
      schedule();
    };
    const onLeave = () => {
      inside = false;
      for (const m of pushed) {
        m.style.removeProperty("--push-x");
        m.style.removeProperty("--push-y");
      }
      pushed.clear();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <span ref={ref} hidden />;
}
