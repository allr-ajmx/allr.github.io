"use client";

import { useEffect, useRef } from "react";
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { AMBIENT_FRAG } from "@/components/ambient.frag";
import { ScrollTrigger } from "@/lib/motion";

/**
 * The page atmosphere: one fullscreen quad running one fragment shader.
 *
 * This replaces a hand-rolled Canvas2D layer that drew at 0.55x and was
 * stretched to fit, which made every fine line soft and every wide gradient
 * band. A shader renders at true device resolution for free, so there is no
 * resolution compromise left to make and nothing that behaves differently at
 * 1x than at 3x.
 *
 * MOTION.md 5.5: this is *the* ambient system. Do not add a second one, and
 * do not let the mote count grow past twenty (5.6 refuses particle fields).
 */
export function AmbientShader() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;

    const canvas = document.createElement("canvas");
    // Probe before constructing a renderer: three throws if WebGL is missing,
    // and a thrown error here would take the whole page down over decoration.
    const probe = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!probe) return; // the CSS mesh underneath stays visible

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
    } catch {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    const uniforms = {
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uStir: { value: 0 },
    };

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const material = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          // y is flipped so the shader can read CSS percentages directly:
          // vUv.y = 0 at the top of the viewport.
          vUv = vec2(uv.x, 1.0 - uv.y);
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: AMBIENT_FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);

    canvas.className = "absolute inset-0 h-full w-full";
    mount.appendChild(canvas);

    let raf = 0;
    let start = performance.now();
    let last = 0;
    // The orbs drift on 22-30s periods and the rings turn once every 120s.
    // Nothing here moves fast enough to need 60fps, and a fullscreen fragment
    // program is the one thing on the page that costs real GPU time, so cap
    // it. Halves the work for no visible difference.
    const FRAME = 1000 / 30;
    let scroll = 0, scrollTarget = 0, stir = 0, lastY = window.scrollY;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(
        w * renderer.getPixelRatio(),
        h * renderer.getPixelRatio(),
      );
    };

    const draw = () => renderer.render(scene, camera);

    const tick = (now: number) => {
      if (now - last >= FRAME) {
        last = now;
        uniforms.uTime.value = (now - start) / 1000;
        scroll += (scrollTarget - scroll) * 0.08;
        stir *= 0.92;
        if (stir < 0.005) stir = 0;
        uniforms.uScroll.value = scroll;
        uniforms.uStir.value = stir;
        draw();
      }
      raf = document.hidden ? 0 : requestAnimationFrame(tick);
    };

    // One scroll authority: the same ScrollTrigger that drives every reveal
    // and parallax on the page also tells the background where it is.
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        scrollTarget = self.progress;
        const y = window.scrollY;
        if (!still.matches) stir = Math.min(1, stir + Math.abs(y - lastY) / 900);
        lastY = y;
        if (still.matches) {
          scroll = scrollTarget;
          uniforms.uScroll.value = scroll;
          draw();
        }
      },
      onRefresh: (self) => {
        scrollTarget = self.progress;
        if (still.matches) {
          scroll = scrollTarget;
          uniforms.uScroll.value = scroll;
        }
      },
    });

    const startLoop = () => {
      if (still.matches) {
        // MOTION.md 2: one frozen frame. No loop at all.
        uniforms.uTime.value = 0;
        draw();
        return;
      }
      if (!raf) {
        start = performance.now();
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    let resizeTimer = 0;
    let lastW = window.innerWidth, lastH = window.innerHeight;
    const onResize = () => {
      // Mobile browsers resize constantly as the URL bar hides; only a real
      // change is worth a reallocation.
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        lastW = window.innerWidth;
        lastH = window.innerHeight;
        resize();
        if (still.matches) draw();
      }, 150);
    };

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    const onMotionChange = () => {
      stopLoop();
      startLoop();
    };
    const onContextLost = (e: Event) => {
      e.preventDefault();
      stopLoop();
    };

    resize();
    startLoop();

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    still.addEventListener("change", onMotionChange);
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      stopLoop();
      st.kill();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      still.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={host}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* What a no-JS visitor sees, what shows if WebGL is unavailable, and
          what covers the gap before the first frame. Without it every load
          flashes flat colour. */}
      <div className="absolute inset-0 bg-[#fdfcf9]" />
      <div className="ambient-mesh absolute inset-0 opacity-50" />
    </div>
  );
}
