"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, EASE } from "@/lib/motion";

/**
 * Plays the hero entrance for the section it is dropped into.
 *
 * Like `Agitator`, this renders nothing and reaches up to its own section, so
 * the pages that use it stay server components — only the motion is client
 * code. Elements opt in with `hero-enter` (copy) or `hero-enter-console` (the
 * window/graphic, which also settles a touch in scale) and set their own beat
 * with `data-enter` in seconds.
 *
 * The `.js`-gated CSS still hides them before the first paint, exactly as it
 * does for `Reveal`; this only supplies the movement.
 */
export function HeroEnter() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const root = ref.current?.closest<HTMLElement>("section");
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const copy = Array.from(root.querySelectorAll<HTMLElement>(".hero-enter"));
        const console_ = Array.from(root.querySelectorAll<HTMLElement>(".hero-enter-console"));
        const delay = (el: HTMLElement) => Number(el.dataset.enter ?? 0);

        // `fromTo`, not `from`: the CSS above already holds these at
        // opacity 0, so a `from` tween would read 0 as the *destination* and
        // animate nothing.
        const tweens = [
          ...copy.map((el) =>
            gsap.fromTo(el,
              { opacity: 0, y: 22 },
              {
                opacity: 1, y: 0, duration: 0.9, delay: delay(el), ease: EASE.soft,
                onComplete: () => gsap.set(el, { clearProps: "transform" }),
              },
            ),
          ),
          ...console_.map((el) =>
            gsap.fromTo(el,
              { opacity: 0, y: 16, scale: 0.98 },
              {
                opacity: 1, y: 0, scale: 1, duration: 1, delay: delay(el), ease: EASE.soft,
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

  return <span ref={ref} hidden />;
}
