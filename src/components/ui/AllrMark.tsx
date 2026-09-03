"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { cx } from "@/lib/cx";
import { gsap, EASE } from "@/lib/motion";

/**
 * The Allr mark as inline SVG — six petals on a sand disc, exactly the
 * geometry of /public/logo_base.svg. Inline so the petals can move: with
 * `bloom` they scale in one after another (the loader's intro, ported to CSS
 * and the light brand). Reduced motion renders the resting mark.
 */
export function AllrMark({
  size,
  bloom = false,
  spin = false,
  rotate,
  highlight,
  instant = false,
  className,
}: {
  /** Pixel size, or a CSS length such as "0.9em" to sit inside text. */
  size: number | string;
  bloom?: boolean;
  /** After blooming, the petals keep turning — one revolution every 40s. */
  spin?: boolean;
  /** Turn the petal group by this many degrees (eases unless `instant`). */
  rotate?: number;
  /** Petal index to light up; the other five dim. */
  highlight?: number;
  /** Apply `rotate` with no easing — for scroll-driven motion. */
  instant?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const svg = ref.current;
      if (!svg || (!bloom && !spin)) return;

      const mm = gsap.matchMedia();
      // Reduced motion renders the resting mark: MOTION.md §2 wants the
      // finished frame, and §5.1b says the bloom plays once and nowhere else
      // does the mark move.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline();
        if (bloom) {
          const disc = svg.querySelector(".mark__disc");
          const petals = svg.querySelectorAll<SVGPathElement>(".mark__petal");
          if (disc) tl.fromTo(disc, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: EASE.soft }, 0);
          // `--pop`, not `scale`: CSS applies it about each petal's own centre.
          // The spring ease overshoots and settles — the 0 → 1.22 → 1 the
          // keyframe spelled out by hand.
          tl.fromTo(petals,
            { "--pop": 0, opacity: 0 },
            {
              "--pop": 1, opacity: 1, duration: 0.85,
              ease: EASE.spring, stagger: 0.1,
              // Release opacity so `.mark--focus` can dim the other five; a
              // stuck inline `opacity: 1` outranks the stylesheet forever.
              onComplete: () => gsap.set(petals, { clearProps: "opacity" }),
            }, 0.15);
        }
        let turn: gsap.core.Tween | undefined;
        if (spin) {
          const group = svg.querySelector(".mark__petals");
          if (group) {
            turn = gsap.fromTo(group,
              { "--turn": "0deg" },
              { "--turn": "360deg", duration: 40, ease: "none", repeat: -1 });
          }
        }
        return () => { tl.kill(); turn?.kill(); };
      });

      return () => mm.revert();
    },
    { scope: ref, dependencies: [bloom, spin] },
  );

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 67.186 67.186"
      aria-hidden="true"
      className={cx("mark", highlight !== undefined && "mark--focus", className)}
      style={highlight !== undefined ? ({ ["--focus" as string]: highlight } as React.CSSProperties) : undefined}
    >
      <g transform="translate(-107.68542,-80.168747)">
        <circle className="mark__disc" cx="141.27841" cy="113.76175" r="28.628906" fill="#fbf1e2" />
        <g transform="translate(4.9724772,4.9939355)">
        <g
          className={cx("mark__petals", rotate !== undefined && !instant && "mark__petals--eased")}
          style={rotate !== undefined ? ({ ["--turn" as string]: `${rotate}deg` } as React.CSSProperties) : undefined}
        >
          <path className="mark__petal" data-petal="0" style={{ ["--n" as string]: 0 }} fill="#74926b" d="m 114.51276,94.26887 c 3.89132,-5.66186 10.64797,-10.09602 15.25668,-11.09926 1.52085,-0.25236 3.80718,-0.49722 3.68969,1.11549 -0.48624,5.52377 -0.97247,11.537445 -1.45871,12.871003 -1.82182,4.825317 -4.18703,4.683557 -6.4355,4.290337 -4.87441,-1.10857 -7.48031,-2.44398 -10.1252,-3.775496 -1.77053,-1.017281 -1.5627,-2.396164 -0.92696,-3.402074 z" />
          <path className="mark__petal" data-petal="1" style={{ ["--n" as string]: 1 }} fill="#f7c14c" d="m 137.9658,82.64489 c 6.84898,0.53905 14.0674,4.1734 17.24058,7.66304 0.97898,1.19092 2.3342,3.04851 0.8788,3.75311 -5.02684,2.340792 -10.47795,4.926542 -11.87597,5.172225 -5.08976,0.834915 -6.14959,-1.284294 -6.93329,-3.428139 C 135.79876,91.02948 135.65232,88.105 135.483,85.1487 c -0.004,-2.04197 1.29379,-2.55142 2.4828,-2.50381 z" />
          <path className="mark__petal" data-petal="2" style={{ ["--n" as string]: 2 }} fill="#e6981a" d="m 159.75898,97.143829 c 2.95766,6.200911 3.41943,14.269421 1.98391,18.762301 -0.54188,1.44328 -1.47299,3.54573 -2.81089,2.63762 -4.54061,-3.18298 -9.50549,-6.6109 -10.41726,-7.69878 -3.26795,-3.99041 -1.96257,-5.96785 -0.4978,-7.71848 3.39725,-3.667078 5.85671,-5.256139 8.33228,-6.880924 1.7664,-1.024446 2.85649,-0.155255 3.40976,0.898263 z" />
          <path className="mark__petal" data-petal="3" style={{ ["--n" as string]: 3 }} fill="#f8dc8d" d="m 158.09913,123.26675 c -3.89132,5.66186 -10.64797,10.09602 -15.25668,11.09926 -1.52086,0.25236 -3.80719,0.49722 -3.68969,-1.11549 0.48624,-5.52377 0.97246,-11.53745 1.4587,-12.871 1.82183,-4.82533 4.18703,-4.68356 6.43551,-4.29034 4.87441,1.10856 7.4803,2.44398 10.12519,3.7755 1.7704,1.01752 1.5627,2.39616 0.92697,3.40207 z" />
          <path className="mark__petal" data-petal="4" style={{ ["--n" as string]: 4 }} fill="#34905e" d="m 134.64608,134.89073 c -6.84897,-0.53905 -14.06739,-4.1734 -17.24058,-7.66304 -0.97897,-1.19092 -2.33419,-3.04851 -0.8788,-3.75311 5.02685,-2.34079 10.47796,-4.92654 11.87597,-5.17223 5.08976,-0.83491 6.14959,1.2843 6.93329,3.42814 1.47716,4.77565 1.6236,7.70013 1.79292,10.65643 0.004,2.04197 -1.29379,2.55142 -2.4828,2.50381 z" />
          <path className="mark__petal" data-petal="5" style={{ ["--n" as string]: 5 }} fill="#9bb289" d="m 112.8529,120.39179 c -2.95766,-6.20091 -3.41943,-14.26942 -1.9839,-18.7623 0.54188,-1.44328 1.47299,-3.545727 2.81088,-2.63762 4.54061,3.18299 9.5055,6.61091 10.41727,7.69878 3.26794,3.9904 1.96256,5.96785 0.49779,7.71847 -3.39725,3.66708 -5.85671,5.25615 -8.33228,6.88093 -1.76639,1.02445 -2.85649,0.15526 -3.40976,-0.89826 z" />
        </g>
        </g>
      </g>
    </svg>
  );
}
