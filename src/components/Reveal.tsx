"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { cx } from "@/lib/cx";
import { gsap, EASE } from "@/lib/motion";
import { whenReached } from "@/components/motion/revealQueue";

export type RevealVariant = "up" | "fade" | "scale" | "left" | "right" | "blur" | "wipe";

/**
 * Fades its content up the first time it scrolls into view.
 *
 * It renders as the element itself (rather than wrapping one) so it can be
 * dropped into a grid without adding a layout box. The `group` class plus the
 * `data-reveal` attribute let descendants react to the reveal too — that is how
 * the "ready" pills on the cards flip from honey to green.
 *
 * The motion is GSAP; the *first frame* is still CSS. That split is deliberate:
 * `.js [data-reveal="hidden"]` in globals.css is applied by a blocking script
 * before the first paint, whereas any JS we run lands after it. Setting the
 * hidden state here instead would flash the content in and back out on every
 * load. `armed` then hands the element over to GSAP and switches the CSS
 * transition off, so the two never drive the same property at once.
 */

type FromTo = { from: gsap.TweenVars; duration: number };

const VARIANTS: Record<RevealVariant, FromTo> = {
  up: { from: { opacity: 0, y: 18 }, duration: 0.55 },
  fade: { from: { opacity: 0 }, duration: 0.55 },
  scale: { from: { opacity: 0, scale: 0.97 }, duration: 0.55 },
  left: { from: { opacity: 0, x: -14 }, duration: 0.55 },
  right: { from: { opacity: 0, x: 14 }, duration: 0.55 },
  // Headlines come into focus, not just into view.
  blur: { from: { opacity: 0, y: 10, scale: 0.985, filter: "blur(10px)" }, duration: 0.9 },
  // The promise: a wipe from the left, like ink being laid down. Opacity stays
  // at 1 — the mask does the reveal.
  wipe: { from: { opacity: 1, "--wipe": "-18%" }, duration: 1.1 },
};

/** The resting value for each property a variant might start from. */
const REST: gsap.TweenVars = {
  opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", "--wipe": "100%",
};

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
  const [state, setState] = useState<"hidden" | "armed" | "shown">("hidden");

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const spec = VARIANTS[variant];

      const mm = gsap.matchMedia();

      // MOTION.md §2: reduced motion is not "no animation", it is the finished
      // frame — reveals are instant opacity 1.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { clearProps: "all" });
        setState("shown");
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Take the element over from CSS at exactly the values CSS was
        // already showing, so the handover is invisible.
        gsap.set(el, spec.from);
        setState("armed");

        // Only the properties this variant actually starts from. Spreading a
        // fixed set here meant `fade` and `wipe` — both of which declare
        // `transform: none` — still got an inline `transform` and `filter`,
        // and an element with either becomes a containing block and a
        // stacking context, which breaks `position: sticky` and `-z-10`
        // descendants for the length of the reveal.
        const animated = Object.keys(spec.from);
        const tween = gsap.to(el, {
          ...Object.fromEntries(animated.map((k) => [k, REST[k as keyof gsap.TweenVars]])),
          duration: spec.duration,
          delay: delay / 1000,
          ease: EASE.soft,
          paused: true,
          onComplete: () => {
            setState("shown");
            // Hand layout back to the stylesheet. `--wipe` is deliberately
            // kept: its @property initial value is 100%, but the mask reads it
            // every frame and clearing it mid-paint flickers.
            const clear = animated.filter((k) => k !== "--wipe");
            if (clear.length) gsap.set(el, { clearProps: clear.join(",") });
          },
        });

        // Children marked `stagger-child` rise in behind the parent.
        const kids = Array.from(el.querySelectorAll<HTMLElement>(".stagger-child"))
          .filter((k) => k.closest("[data-reveal]") === el);
        const kidTween = kids.length
          ? gsap.from(kids, {
              opacity: 0, y: 14, duration: 0.45, ease: EASE.soft,
              stagger: 0.045, delay: delay / 1000, paused: true,
              onComplete: () => gsap.set(kids, { clearProps: "transform,opacity" }),
            })
          : null;

        const play = () => {
          tween.play();
          kidTween?.play();
        };

        // One shared, live-layout scroll queue decides when. See
        // motion/revealQueue.ts for why neither ScrollTrigger nor a bare
        // IntersectionObserver is reliable for a one-shot trigger.
        const unwatch = whenReached(el, play);

        return () => {
          unwatch();
          tween.kill();
          kidTween?.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [variant, delay] },
  );

  return (
    <div
      ref={ref}
      data-reveal={state}
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
