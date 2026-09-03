"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

/**
 * The single motion authority for the site.
 *
 * Everything that moves registers here, so there is one place that decides
 * timing, easing and what `prefers-reduced-motion` means. Importing this
 * module is what installs the plugins — do it before any tween.
 *
 * The CSS kill-switch in globals.css (`animation: none !important`) has no
 * power over GSAP, because GSAP writes inline styles. Reduced motion is
 * therefore handled here, in `matchMedia`, and nowhere else.
 */

let registered = false;

if (typeof window !== "undefined" && !registered) {
  registered = true;
  gsap.registerPlugin(ScrollTrigger, CustomEase);

  // The three named curves from MOTION.md §2, registered by name so a tween
  // reads like the contract. These are not interchangeable with GSAP's own
  // eases — `power3.out` is NOT cubic-bezier(0.22, 1, 0.36, 1), and quietly
  // substituting it would change every settle on the site.
  CustomEase.create("ease-out-soft", "0.22, 1, 0.36, 1");
  CustomEase.create("ease-spring", "0.34, 1.56, 0.64, 1");
  CustomEase.create("ease-ink", "0.45, 0, 0.2, 1");

  gsap.defaults({ ease: "ease-out-soft" });

  // Anchor links use CSS smooth scrolling; keep ScrollTrigger in step with it.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ScrollTrigger caches every start/end position on refresh, and it refreshes
  // before the web fonts have finished laying the page out. Every measurement
  // taken at that moment is against the wrong document height, which shows up
  // as whole pages of reveals that never fire. Re-measure once type settles.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
  }
}

/** MOTION.md §2 timing constants, in seconds (GSAP's unit). */
export const T = {
  /** One artifact in the console sequence. */
  STEP: 0.88,
  /** Card / still entering. */
  SETTLE: 0.7,
  /** Idle → working wash. */
  INK: 0.64,
  /** Working → done + green ring. */
  LIVE: 0.48,
  /** Neighbours in a row. */
  STAGGER: 0.07,
  /** Live dot. */
  PULSE: 2.4,
  /** The one loop on the page: `live` is an ongoing state. */
  BREATHE: 4.5,
} as const;

export const EASE = {
  soft: "ease-out-soft",
  spring: "ease-spring",
  ink: "ease-ink",
} as const;

/** True when the visitor asked for less motion. Safe during SSR. */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The one shape every animated component uses.
 *
 * `motion` runs for visitors who want it; `still` is NOT "do nothing" — per
 * MOTION.md §2 it must place things at their done/live frame, because a
 * reduced-motion visitor should see the finished state, not an empty one.
 */
export function motionMedia() {
  return gsap.matchMedia();
}

export const MEDIA = {
  motion: "(prefers-reduced-motion: no-preference)",
  still: "(prefers-reduced-motion: reduce)",
} as const;

export { gsap, ScrollTrigger };
