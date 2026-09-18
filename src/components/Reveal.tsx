"use client";

import { useRef, useState, useEffect } from "react";
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
  blur: { from: { opacity: 0, y: 10, scale: 0.985, filter: "blur(10px)" }, duration: 0.9 },
  wipe: { from: { opacity: 1, "--wipe": "-18%" }, duration: 1.1 },
};

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

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { clearProps: "all" });
        setState("shown");
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(el, spec.from);
        setState("armed");

        const animated = Object.keys(spec.from);
        const tween = gsap.to(el, {
          ...Object.fromEntries(animated.map((k) => [k, REST[k as keyof gsap.TweenVars]])),
          duration: spec.duration,
          delay: delay / 1000,
          ease: EASE.soft,
          paused: true,
          onComplete: () => {
            setState("shown");
            const clear = animated.filter((k) => k !== "--wipe");
            if (clear.length) gsap.set(el, { clearProps: clear.join(",") });
          },
        });

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

  // Failsafe: never leave the page blank if GSAP/matchMedia never arms.
  useEffect(() => {
    if (state === "shown") return;
    const id = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      if (el.getAttribute("data-reveal") === "shown") return;
      gsap.set(el, { clearProps: "all", opacity: 1, x: 0, y: 0, scale: 1, filter: "none" });
      setState("shown");
    }, 1800);
    return () => window.clearTimeout(id);
  }, [state]);

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
