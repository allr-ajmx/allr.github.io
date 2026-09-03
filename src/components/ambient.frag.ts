/**
 * The page atmosphere, as one fragment program.
 *
 * Every constant here is lifted from the CSS this replaces (`.ambient-*` in
 * git history) — same colour stops, same radii, same periods. It is a port,
 * not a redesign, and it must stay indistinguishable at rest.
 *
 * There is deliberately NO grain term. The design calls for clear, smooth
 * visuals; the only thing applied at the end is a sub-perceptual dither, which
 * exists to stop wide soft gradients collapsing into contour rings on an 8-bit
 * display. Dither is what makes a gradient look smooth — it is the opposite of
 * grain, not a small amount of it.
 *
 * Coordinates: `p` is 0..1 across the viewport with y running DOWN, so the CSS
 * percentages below can be read straight across.
 */
export const AMBIENT_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2  uResolution;
uniform float uTime;   // seconds
uniform float uScroll; // 0 at the top of the page .. 1 at the bottom
uniform float uStir;   // decays back to 0 after fast scrolling

/* ---- helpers ------------------------------------------------------------ */

/* A CSS radial-gradient(ellipse RX RY at CX CY) falloff, 1 at the centre. */
float ellipseFall(vec2 p, vec2 c, vec2 r, float stop) {
  float d = length((p - c) / r);
  return 1.0 - smoothstep(0.0, stop, d);
}

/* Progress along a CSS linear-gradient at 'deg' (0deg = up, clockwise). */
float axis(vec2 p, float deg) {
  float a = radians(deg - 90.0);
  vec2 dir = vec2(cos(a), sin(a));
  return dot(p - 0.5, dir) + 0.5;
}

float band(float t, float a, float b) {
  return smoothstep(a, (a + b) * 0.5, t) * (1.0 - smoothstep((a + b) * 0.5, b, t));
}

/*
 * One firefly's position. Three incommensurate sines per axis give smooth
 * wandering that has no visible period and needs no state on the CPU — every
 * firefly is a pure function of time and its index.
 *
 * z is depth: 0 far, 1 near. It drives size, brightness and focus together,
 * which is what sells "coming toward you" rather than "getting bigger".
 */
vec3 fireflyAt(float i, float t) {
  float a = i * 7.31;
  return vec3(
    0.50 + 0.40 * sin(t * 0.113 + a) * cos(t * 0.071 + a * 1.7),
    0.48 + 0.36 * sin(t * 0.094 + a * 2.3) * cos(t * 0.127 + a * 0.9),
    0.50 + 0.50 * sin(t * 0.083 + a * 3.1)
  );
}

/* 0 -> 1 -> 0 over 'period', the shape of an alternating ease-in-out loop. */
float swing(float t, float period) {
  return 0.5 - 0.5 * cos(6.2831853 * t / period);
}

/*
 * "Keep the middle of the page clean paper; colour lives at the edges."
 * This is what keeps body copy readable over the atmosphere — not decoration.
 */
float edgeMask(float x) {
  float l = 1.0 - smoothstep(0.0, 0.38, x);
  float r = smoothstep(0.62, 1.0, x);
  return clamp(max(l, r), 0.0, 1.0);
}

void main() {
  vec2 p = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  /* Scroll shifts the honey/green balance and lifts the field. Neutral at the
     very top: p=0 must reproduce the designed frame exactly. */
  float warm = 1.0 - 0.18 * uScroll;
  float cool = 1.0 + 0.25 * uScroll;
  float lift = uScroll * 0.10 + uStir * 0.012;

  /* ---- base + mesh ------------------------------------------------------ */
  float ax = clamp(axis(p, 165.0), 0.0, 1.0);
  vec3 col = mix(vec3(0.992, 0.973, 0.937), vec3(0.969, 0.941, 0.890), smoothstep(0.00, 0.28, ax));
  col = mix(col, vec3(0.953, 0.922, 0.878), smoothstep(0.28, 0.52, ax));
  col = mix(col, vec3(0.933, 0.961, 0.937), smoothstep(0.52, 0.78, ax));
  col = mix(col, vec3(0.965, 0.937, 0.894), smoothstep(0.78, 1.00, ax));

  col = mix(col, vec3(1.000, 0.980, 0.941), 0.70 * 0.5 * ellipseFall(p, vec2(0.48, 0.48), vec2(0.40, 0.35), 0.70));
  col = mix(col, vec3(0.965, 0.773, 0.420), 0.20 * warm * 0.5 * ellipseFall(p, vec2(0.18, 0.88 - lift), vec2(0.70, 0.55), 0.60));
  col = mix(col, vec3(0.118, 0.478, 0.286), 0.12 * cool * 0.5 * ellipseFall(p, vec2(0.78, 0.78 - lift), vec2(0.60, 0.50), 0.65));
  col = mix(col, vec3(0.180, 0.620, 0.388), 0.16 * cool * 0.5 * ellipseFall(p, vec2(0.88, 0.22 - lift), vec2(0.50, 0.40), 0.60));
  col = mix(col, vec3(0.914, 0.659, 0.243), 0.22 * warm * 0.5 * ellipseFall(p, vec2(0.12, 0.30 - lift), vec2(0.55, 0.45), 0.62));
  col = mix(col, vec3(1.000, 0.925, 0.776), 0.85 * 0.5 * ellipseFall(p, vec2(0.50, -0.05), vec2(0.90, 0.70), 0.58));

  /* ---- ribbons: two soft diagonals, multiplied down ---------------------- */
  float r1 = axis(p, 118.0);
  vec3 ribbon = vec3(1.0);
  ribbon = mix(ribbon, vec3(0.914, 0.659, 0.243), 0.07 * band(r1, 0.38, 0.50));
  ribbon = mix(ribbon, vec3(1.000, 0.973, 0.902), 0.35 * band(r1, 0.46, 0.54));
  ribbon = mix(ribbon, vec3(0.180, 0.620, 0.388), 0.05 * band(r1, 0.50, 0.62));
  float r2 = axis(p, 152.0);
  ribbon = mix(ribbon, vec3(0.180, 0.620, 0.388), 0.06 * band(r2, 0.55, 0.68));
  ribbon = mix(ribbon, vec3(0.914, 0.659, 0.243), 0.05 * band(r2, 0.62, 0.76));
  col = mix(col, col * ribbon, 0.30);

  /* ---- the four lamplight orbs, on their own 22/28/24/30s clocks -------- */
  float em = edgeMask(p.x);
  float k = 0.35 * em;

  vec2 oa = vec2(-0.08, -0.18 - lift) + vec2(0.04, 0.06) * swing(uTime, 22.0) * 0.30;
  col = mix(col, vec3(0.914, 0.659, 0.243), 0.38 * warm * k * ellipseFall(p, oa + vec2(0.26, 0.26 * aspect), vec2(0.30, 0.30 * aspect), 0.98));

  vec2 ob = vec2(0.86, 0.12 - lift) + vec2(-0.05, -0.04) * swing(uTime, 28.0) * 0.30;
  col = mix(col, vec3(0.180, 0.620, 0.388), 0.22 * cool * k * ellipseFall(p, ob + vec2(0.10, 0.28 * aspect), vec2(0.32, 0.32 * aspect), 0.98));

  vec2 oc = vec2(-0.12, 0.48 - lift) + vec2(0.03, -0.07) * swing(uTime, 24.0) * 0.30;
  col = mix(col, vec3(0.965, 0.773, 0.420), 0.28 * warm * k * ellipseFall(p, oc + vec2(0.22, 0.22 * aspect), vec2(0.25, 0.25 * aspect), 0.98));

  vec2 od = vec2(0.66, 0.86 - lift) + vec2(-0.06, 0.05) * swing(uTime, 30.0) * 0.30;
  col = mix(col, vec3(0.118, 0.478, 0.286), 0.16 * cool * k * ellipseFall(p, od + vec2(0.14, 0.14 * aspect), vec2(0.28, 0.28 * aspect), 0.98));

  /*
   * A warm shadow drifting a closed figure-eight, once every 46s.
   * Deliberately the slowest thing on the page: at this size it crosses a few
   * pixels a second, which is the "very minor" it is meant to be. Honey-deep
   * rather than a bright glow, so it reads as a shadow passing over paper.
   * It thins toward the centre column but never vanishes — the readable-middle
   * rule still applies, it just does not need to be absolute for 5% alpha.
   */
  float bt = uTime / 46.0;
  vec2 blobC = vec2(
    0.50 + 0.34 * sin(6.2831853 * bt),
    0.46 + 0.24 * sin(12.5663706 * bt)
  );
  // pow() concentrates the falloff toward the centre: same soft edge, much
  // less spread, so it reads as a defined shadow rather than a haze.
  float blob = pow(ellipseFall(p, blobC, vec2(0.17, 0.17 * aspect), 0.88), 2.2);
  col = mix(col, vec3(0.718, 0.494, 0.122), 0.055 * blob * (0.35 + 0.65 * em));

  /* ---- lamplight beams: two cones from the top, faded down the page ----- */
  float lamp = 0.06 * uScroll;
  float beamMask = 1.0 - smoothstep(0.35, 0.78, p.y);
  float beamAlpha = 0.72 + 0.23 * swing(uTime, 10.0);

  vec2 b1 = (p - vec2(0.72, 0.08 + lamp)) * vec2(aspect, 1.0);
  float a1 = degrees(atan(b1.x, -b1.y)) - 210.0 + 90.0;
  a1 = mod(a1 + 360.0, 360.0);
  float cone1 = band(a1, 0.0, 16.0) * 0.22 + band(a1, 28.0, 42.0) * 0.12 + band(a1, 55.0, 72.0) * 0.18;
  col = mix(col, vec3(1.000, 0.945, 0.812), cone1 * beamMask * beamAlpha);

  vec2 b2 = (p - vec2(0.18, 0.0 + lamp)) * vec2(aspect, 1.0);
  float a2 = degrees(atan(b2.x, -b2.y)) - 190.0 + 90.0;
  a2 = mod(a2 + 360.0, 360.0);
  col = mix(col, vec3(0.965, 0.773, 0.420), band(a2, 0.0, 20.0) * 0.10 * beamMask * beamAlpha);

  /* ---- soft grid, radially faded then edge-masked ----------------------- */
  vec2 px = p * uResolution;
  vec2 g = abs(fract(px / 56.0) - 0.5) / fwidth(px / 56.0);
  float grid = 1.0 - clamp(min(g.x, g.y), 0.0, 1.0);
  float gridFade = 1.0 - smoothstep(0.0, 1.0, length((p - vec2(0.5, 0.4)) / vec2(0.65, 0.65)));
  col = mix(col, vec3(0.133, 0.231, 0.200), grid * 0.045 * gridFade * 0.4 * em);

  /* ---- five concentric rings, one turn every 120s ------------------------ */
  float ang = 6.2831853 * fract(uTime / 120.0);
  vec2 hub = vec2(0.45, 0.48);
  vec2 rp = p - hub;
  rp = vec2(rp.x * cos(-ang) - rp.y * sin(-ang) * 1.0, rp.x * sin(-ang) + rp.y * cos(-ang));
  rp += hub;
  float ringPx = 1.0 / max(uResolution.y, 1.0);
  vec3 ringCol = mix(vec3(0.914, 0.659, 0.243), vec3(0.180, 0.620, 0.388), clamp(p.x + p.y, 0.0, 1.0) * 0.5);
  for (int i = 0; i < 5; i++) {
    vec2 c  = i < 3 ? vec2(0.72, 0.18) : vec2(0.18, 0.78);
    float R = i == 0 ? 180.0 : i == 1 ? 260.0 : i == 2 ? 340.0 : i == 3 ? 200.0 : 290.0;
    float w = i == 0 ? 1.2   : i == 1 ? 1.0   : i == 2 ? 0.8   : i == 3 ? 1.0   : 0.8;
    float o = i == 0 ? 0.55  : i == 1 ? 0.40  : i == 2 ? 0.28  : i == 3 ? 0.35  : 0.22;
    float d = abs(length((rp - c) * vec2(aspect, 1.0) * uResolution.y) - R);
    col = mix(col, ringCol, (1.0 - smoothstep(0.0, w, d)) * o * 0.28 * 0.4 * em);
  }

  /* ---- twenty motes. Twenty. MOTION.md 5.6 refuses particle fields. ------ */
  #define MOTE(MX, MY, MS, MR, MG, MB, MD, MP) { \
    float s = swing(uTime + MD, MP); \
    vec2  c = vec2(MX + 0.012 * s, MY - 0.028 * s); \
    float a = 0.09 + 0.22 * sin(3.14159 * s) * (1.0 - 0.25 * s); \
    float rr = (MS * 0.5 + 4.0) / uResolution.y; \
    float d = length((p - c) * vec2(aspect, 1.0)); \
    col = mix(col, vec3(MR, MG, MB), a * (1.0 - smoothstep(0.0, rr, d))); \
  }
  MOTE(0.08, 0.14, 3.0, 0.914, 0.659, 0.243, 0.0, 11.0)
  MOTE(0.18, 0.32, 2.0, 0.965, 0.773, 0.420, 1.2, 14.0)
  MOTE(0.28, 0.08, 4.0, 0.914, 0.659, 0.243, 0.4, 12.0)
  MOTE(0.42, 0.22, 2.0, 0.180, 0.620, 0.388, 2.1, 15.0)
  MOTE(0.55, 0.12, 3.0, 0.965, 0.773, 0.420, 0.8, 13.0)
  MOTE(0.68, 0.28, 2.0, 0.914, 0.659, 0.243, 1.6, 16.0)
  MOTE(0.78, 0.16, 5.0, 0.914, 0.659, 0.243, 0.2, 12.0)
  MOTE(0.88, 0.38, 2.0, 0.180, 0.620, 0.388, 2.8, 14.0)
  MOTE(0.12, 0.58, 3.0, 0.965, 0.773, 0.420, 1.0, 15.0)
  MOTE(0.24, 0.72, 2.0, 0.914, 0.659, 0.243, 3.2, 13.0)
  MOTE(0.36, 0.48, 4.0, 0.180, 0.620, 0.388, 0.6, 17.0)
  MOTE(0.48, 0.64, 2.0, 0.965, 0.773, 0.420, 2.4, 12.0)
  MOTE(0.62, 0.52, 3.0, 0.914, 0.659, 0.243, 1.4, 14.0)
  MOTE(0.74, 0.68, 2.0, 0.180, 0.620, 0.388, 0.9, 16.0)
  MOTE(0.86, 0.58, 4.0, 0.965, 0.773, 0.420, 2.0, 11.0)
  MOTE(0.06, 0.84, 3.0, 0.914, 0.659, 0.243, 1.8, 15.0)
  MOTE(0.52, 0.88, 2.0, 0.180, 0.620, 0.388, 3.0, 13.0)
  MOTE(0.92, 0.78, 3.0, 0.914, 0.659, 0.243, 0.5, 14.0)
  MOTE(0.33, 0.18, 2.0, 0.965, 0.773, 0.420, 2.6, 12.0)
  MOTE(0.70, 0.42, 3.0, 0.914, 0.659, 0.243, 1.1, 15.0)

  /*
   * Five orange fireflies drifting toward and away from the camera.
   *
   * Near ones are larger, brighter and softer-edged; far ones are small, dim
   * and crisp — the same depth-of-field cue a real lens gives, which is what
   * makes the z axis read as depth instead of scale. Five. Not fifteen: §5.6
   * refuses particle fields, and the line between "a few fireflies" and "a
   * particle field" is exactly the count.
   */
  for (int i = 0; i < 5; i++) {
    vec3 f = fireflyAt(float(i), uTime);
    float near = f.z;
    float rad  = mix(0.013, 0.052, near);
    float soft = mix(4.5, 1.6, near);      // far = tight point, near = bloom
    float amp  = mix(0.16, 0.42, near);
    float d = length((p - f.xy) * vec2(aspect, 1.0)) / rad;
    float g = pow(clamp(1.0 - d, 0.0, 1.0), soft);
    col = mix(col, vec3(0.937, 0.616, 0.176), g * amp);
  }

  /* ---- vignette: keeps focus on the content ----------------------------- */
  float vig = smoothstep(0.40, 1.0, length((p - vec2(0.5, 0.4)) / vec2(0.85, 0.75)));
  col = mix(col, vec3(0.133, 0.231, 0.200), vig * 0.06);
  col = mix(col, vec3(0.133, 0.231, 0.200), p.y * 0.03);

  /*
   * Ordered dither, +/-1/255. Below the threshold of perception, and the only
   * thing standing between these very wide, very soft gradients and visible
   * contour rings. Without it "smooth" bands.
   */
  vec2 ip = floor(gl_FragCoord.xy);
  float d4 = fract(dot(ip, vec2(0.0625, 0.15625)) + 0.25 * fract(ip.x * 0.25));
  col += (d4 - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;
