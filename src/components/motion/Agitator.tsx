"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/motion";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

const PUSH_RADIUS = 110; // px around the pointer
const PUSH_MAX = 9; // px of displacement at the pointer

/**
 * Drives the hosting scene: the petals flying the web and the wires, and the
 * way the whole thing reacts to you.
 *
 * The flights used to be ~611 SVG `<animateMotion>` elements — one per petal,
 * each its own timeline, and by a wide margin the most expensive thing on the
 * page. Petals on one stream all follow the same closed path at the same
 * speed and differ only in phase, so this keeps **one clock per stream** and
 * samples every petal's position from a path measured once. Nine clocks
 * instead of six hundred.
 *
 * It also reacts: scrolling raises `--agi` on the scene (wobble amplitude
 * scales with it) and it decays back to calm; the pointer nudges petals within
 * a small radius away from it, very slightly. Off-screen the whole thing stops.
 * Under reduced motion the web is drawn in place and nothing flies.
 */
export function Agitator() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const root = ref.current?.closest<HTMLElement>(".hosting");
    if (!root) return;

    type Flight = {
      raw: ReturnType<typeof MotionPathPlugin.getRawPath>;
      dur: number;
      items: { el: SVGGElement; phase: number }[];
    };

    // Measure every path once. This is the work SMIL was repeating per element.
    const flights: Flight[] = [];
    for (const stream of root.querySelectorAll<SVGGElement>(".hosting__stream[data-path]")) {
      const raw = MotionPathPlugin.getRawPath(stream.dataset.path!);
      MotionPathPlugin.cacheRawPathMeasurements(raw);
      flights.push({
        raw,
        dur: Number(stream.dataset.dur) || 60,
        items: Array.from(stream.querySelectorAll<SVGGElement>(":scope > g[data-phase]")).map((el) => ({
          el,
          phase: Number(el.dataset.phase) || 0,
        })),
      });
    }
    for (const flyer of root.querySelectorAll<SVGGElement>(".hosting__flyer[data-path]")) {
      const raw = MotionPathPlugin.getRawPath(flyer.dataset.path!);
      MotionPathPlugin.cacheRawPathMeasurements(raw);
      const dur = Number(flyer.dataset.dur) || 3.6;
      flights.push({
        raw, dur,
        // `begin` was a negative start offset; as a phase it is the same thing.
        items: [{ el: flyer, phase: -(Number(flyer.dataset.begin) || 0) / dur }],
      });
    }

    const place = (f: Flight, progress: number) => {
      for (const it of f.items) {
        let p = (progress + it.phase) % 1;
        if (p < 0) p += 1;
        // `true` asks for the tangent angle too — the old rotate="auto".
        const pos = MotionPathPlugin.getPositionOnPath(f.raw, p, true) as {
          x: number; y: number; angle: number;
        };
        // `style.transform`, not `setAttribute("transform")`: the attribute
        // form re-parses an SVG transform string on every write, and with six
        // hundred petals a frame that parse is the whole cost.
        it.el.style.transform =
          `translate(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px) rotate(${pos.angle.toFixed(1)}deg)`;
      }
    };

    const mm = gsap.matchMedia();

    // Reduced motion still needs the web drawn — the petals *are* the glyph.
    // It just never moves.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      for (const f of flights) place(f, 0);
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
        const motes = Array.from(root.querySelectorAll<SVGGElement>(".hosting__push"));
        let agi = 0;
        let lastY = window.scrollY;
        let inside = false;
        let px = 0, py = 0;
        const pushed = new Set<SVGGElement>();
        let rects: DOMRect[] = [];
        let readIn = 0;
        let running = false;

        let slowAt = 0;
        const tick = () => {
          const t = gsap.ticker.time;
          // A petal on a 176s loop crosses a fraction of a pixel per frame, so
          // the streams are sampled at ~20fps; the flyers, which cross the
          // stage in three seconds, are not.
          const slow = t - slowAt >= 0.05;
          if (slow) slowAt = t;
          for (const f of flights) {
            if (f.dur > 20 && !slow) continue;
            place(f, (t / f.dur) % 1);
          }

          // agitation decays toward calm
          if (agi > 0.005) {
            agi *= 0.92;
            root.style.setProperty("--agi", agi.toFixed(3));
          } else if (agi !== 0) {
            agi = 0;
            root.style.removeProperty("--agi");
          }

          if (inside) {
            // Read every position first, then write — one layout per frame,
            // not one per petal.
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
        };

        const start = () => {
          if (running) return;
          running = true;
          gsap.ticker.add(tick);
        };
        const stop = () => {
          if (!running) return;
          running = false;
          gsap.ticker.remove(tick);
        };

        // Off-screen, the web costs nothing.
        const io = new IntersectionObserver(
          (entries) => {
            const on = entries.some((e) => e.isIntersecting);
            root.classList.toggle("hosting--paused", !on);
            if (on) start();
            else stop();
          },
          { rootMargin: "10% 0px 10% 0px" },
        );
        io.observe(root);

        const onScroll = () => {
          const y = window.scrollY;
          agi = Math.min(1, agi + Math.abs(y - lastY) / 500);
          lastY = y;
        };
        const onMove = (e: PointerEvent) => { px = e.clientX; py = e.clientY; inside = true; };
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
        // Draw the first frame even before it scrolls into view, so the glyph
        // is never a pile of petals at the origin.
        tick();

        return () => {
          stop();
          io.disconnect();
          window.removeEventListener("scroll", onScroll);
          root.removeEventListener("pointermove", onMove);
          root.removeEventListener("pointerleave", onLeave);
        };
    });

    return () => mm.revert();
  }, { scope: ref });

  return <span ref={ref} hidden />;
}
