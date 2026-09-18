"use client";

import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/motion";

/**
 * Plays the hero entrance for the section it is dropped into.
 *
 * Renders a zero-size marker (not `hidden` / display:none) so the ref stays in
 * normal layout flow for closest("section") and useGSAP scope. Elements opt in
 * with `hero-enter` or `hero-enter-console` and optional `data-enter` delays.
 */
export function HeroEnter() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = ref.current?.closest<HTMLElement>("section");
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const els = root.querySelectorAll<HTMLElement>(
          ".hero-enter, .hero-enter-console",
        );
        gsap.set(els, { clearProps: "all", opacity: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const copy = Array.from(
          root.querySelectorAll<HTMLElement>(".hero-enter"),
        );
        const console_ = Array.from(
          root.querySelectorAll<HTMLElement>(".hero-enter-console"),
        );
        const delay = (el: HTMLElement) => Number(el.dataset.enter ?? 0);

        const tweens = [
          ...copy.map((el) =>
            gsap.fromTo(
              el,
              { opacity: 0, y: 22 },
              {
                opacity: 1,
                y: 0,
                duration: 0.9,
                delay: delay(el),
                ease: EASE.soft,
                onStart: () => {
                  el.style.animation = "none";
                },
                onComplete: () => gsap.set(el, { clearProps: "transform" }),
              },
            ),
          ),
          ...console_.map((el) =>
            gsap.fromTo(
              el,
              { opacity: 0, y: 16, scale: 0.98 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1,
                delay: delay(el),
                ease: EASE.soft,
                onStart: () => {
                  el.style.animation = "none";
                },
                onComplete: () => gsap.set(el, { clearProps: "transform" }),
              },
            ),
          ),
        ];
        return () => tweens.forEach((t) => t.kill());
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  // Failsafe if useGSAP never finds the section / never tweens.
  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("section");
    if (!root) return;
    const id = window.setTimeout(() => {
      const els = root.querySelectorAll<HTMLElement>(
        ".hero-enter, .hero-enter-console",
      );
      els.forEach((el) => {
        if (getComputedStyle(el).opacity === "0") {
          el.style.animation = "none";
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
    }, 1800);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    />
  );
}
