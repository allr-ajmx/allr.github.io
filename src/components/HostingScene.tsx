import { MockFor } from "@/components/mocks/Mocks";
import { Agitator } from "@/components/motion/Agitator";
import { HOSTED } from "@/lib/brand";
import { PETALS, PETAL_BY_ID, PETAL_PATH } from "@/lib/petals";
import type { ShowcaseId } from "@/lib/brand";

/*
 * Hosting, one-directional: the six petals stand around a globe — the
 * internet — and each petal is drawn as a server (rack slots, a status LED).
 * From there, petals themselves travel the wires to the devices on the right,
 * and each screen lights as its petal lands. Hosting is ongoing, so it loops
 * slowly; under reduced motion nothing flies and every screen is lit.
 */

const W = 1100;
const H = 720;
const G = { x: 400, y: 360 }; // globe centre — its left half sits under the copy
const GLOBE_R = 270;
/** Left of this x the web fades out under the text; fully visible right of FADE_IN. */
const FADE_OUT = 110;
const FADE_IN = 630;

type Device = {
  kind: "phone" | "laptop" | "tablet" | "desktop";
  y: number;
  who: string;
  /** What this person opened — each device shows a different thing. */
  shows: ShowcaseId;
  /** Where its wire leaves the globe, in degrees. */
  exit: number;
};
const DEVICES: Device[] = [
  { kind: "phone", y: 100, who: "Mia · the habit tracker", shows: "apps", exit: -48 },
  { kind: "laptop", y: 275, who: "An investor · the deck", shows: "decks", exit: -16 },
  { kind: "tablet", y: 445, who: "A journalist · the press kit", shows: "docs", exit: 16 },
  { kind: "desktop", y: 620, who: "The studio · the launch site", shows: "websites", exit: 48 },
];
const DEVICE_X = 1010;
const devicePos = (d: Device) => ({ x: DEVICE_X, y: d.y });
const DEPLOY = { x: 700, y: 46 };

/**
 * The web glyph — outer circle, a meridian, the equator, two parallels —
 * each line drawn as a stream of tiny petals travelling along it. Paths are
 * closed loops so the motion never jumps.
 */
function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0`;
}
const R = GLOBE_R;
const GLYPH = [
  { d: ellipsePath(G.x, G.y, R, R), n: 120, s: 13.6, dur: 176, alpha: 0.9 },
  { d: ellipsePath(G.x, G.y, R * 0.42, R), n: 80, s: 11.9, dur: 134, alpha: 0.85 },
  { d: ellipsePath(G.x, G.y, R * 0.8, R), n: 72, s: 11.0, dur: 147, alpha: 0.7 },
  { d: ellipsePath(G.x, G.y, R * 0.12, R), n: 61, s: 10.2, dur: 125, alpha: 0.6 },
  { d: ellipsePath(G.x, G.y, R, R * 0.04), n: 77, s: 11.9, dur: 115, alpha: 0.85 },
  { d: ellipsePath(G.x, G.y - R * 0.55, R * 0.83, R * 0.04), n: 61, s: 11.0, dur: 99, alpha: 0.75 },
  { d: ellipsePath(G.x, G.y + R * 0.55, R * 0.83, R * 0.04), n: 61, s: 11.0, dur: 99, alpha: 0.75 },
  { d: ellipsePath(G.x, G.y - R * 0.85, R * 0.52, R * 0.03), n: 37, s: 10.2, dur: 83, alpha: 0.65 },
  { d: ellipsePath(G.x, G.y + R * 0.85, R * 0.52, R * 0.03), n: 37, s: 10.2, dur: 83, alpha: 0.65 },
] as const;

const toXY = (deg: number, r: number) => ({
  x: G.x + Math.cos((deg * Math.PI) / 180) * r,
  y: G.y + Math.sin((deg * Math.PI) / 180) * r,
});

function wire(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = a.x + (b.x - a.x) * 0.55;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function HostingScene() {
  const links = DEVICES.map((d, i) => {
    const p = PETAL_BY_ID[d.shows];
    const pos = devicePos(d);
    const exit = toXY(d.exit, GLOBE_R);
    return { d, p, i, pos, path: wire(exit, { x: pos.x - 78, y: pos.y }) };
  });
  const top = toXY(-62, GLOBE_R);
  const inbound = `M${DEPLOY.x},${DEPLOY.y + 22} L${top.x},${top.y}`;

  return (
    <div className="hosting relative mx-auto w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <Agitator />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="globe-fill" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#e4f4ea" stopOpacity="0.3" />
          </radialGradient>
          {/* the web fades out under the copy on the left and back in on the right */}
          <linearGradient id="fade-lr" gradientUnits="userSpaceOnUse" x1={FADE_OUT} y1="0" x2={FADE_IN} y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.03" />
            <stop offset="0.78" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <mask id="fade-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect x="0" y="0" width={W} height={H} fill="url(#fade-lr)" />
          </mask>
        </defs>

        <g className="hosting__fade">
        {/* the internet — the web glyph, every line a stream of tiny petals */}
        <circle cx={G.x} cy={G.y} r={GLOBE_R} fill="url(#globe-fill)" opacity="0.6" />
        {GLYPH.map((g, ri) => (
          <g key={ri} className="hosting__stream">
            {Array.from({ length: g.n }, (_, k) => {
              // Deterministic per-petal wobble so no two move alike.
              const seed = (k * 7 + ri * 13) % 11;
              return (
                <g key={k}>
                  <g className="hosting__push">
                  <g
                    className={k % 2 ? "hosting__mote hosting__mote--still" : "hosting__mote"}
                    style={{
                      ["--wob-d" as string]: `${2.6 + (seed % 5) * 0.55}s`,
                      ["--wob-a" as string]: `${1.4 + (seed % 3) * 0.6}px`,
                      ["--wob-r" as string]: `${8 + (seed % 4) * 5}deg`,
                      animationDelay: `${-(seed * 0.37)}s`,
                    }}
                  >
                    <path
                      d={PETAL_PATH}
                      fill={PETALS[(k + ri) % PETALS.length].color}
                      opacity={g.alpha}
                      transform={`translate(${-g.s / 2} ${-g.s / 2.9}) scale(${g.s} ${g.s / 1.46})`}
                    />
                  </g>
                  </g>
                  <animateMotion dur={`${g.dur}s`} begin={`${-(k / g.n) * g.dur}s`} repeatCount="indefinite" rotate="auto" path={g.d} />
                </g>
              );
            })}
          </g>
        ))}

        {/* wires */}
        <path d={inbound} className="hosting__line hosting__line--in" />
        {links.map((l) => (
          <path key={l.i} d={l.path} className="hosting__line hosting__line--out" />
        ))}

        </g>
        <text x={G.x + 40} y={G.y + GLOBE_R + 26} textAnchor="middle" className="hosting__label">{HOSTED.center} · the internet</text>

        {/* petals in flight — one per wire, landing on its device */}
        {links.map((l) => (
          <g key={`fly-${l.i}`} className="hosting__flyer">
            <path d={PETAL_PATH} transform="translate(-9 -6) scale(18 12)" fill={l.p.color} />
            <animateMotion dur="3.6s" begin={`${l.i * 0.9}s`} repeatCount="indefinite" rotate="auto" path={l.path} />
          </g>
        ))}
        <g className="hosting__flyer">
          <path d={PETAL_PATH} transform="translate(-8 -5.5) scale(16 11)" fill="#f7c14c" />
          <animateMotion dur="3s" begin="0.4s" repeatCount="indefinite" rotate="auto" path={inbound} />
        </g>
      </svg>

      <div className="absolute" style={{ left: pct(DEPLOY.x, W), top: pct(DEPLOY.y, H), transform: "translate(-50%,-50%)" }}>
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-control border border-line bg-card px-3 py-1.5 text-[.72rem] font-bold shadow-soft">
          <span className="text-honey-deep">You · deploy {HOSTED.source.version}</span>
          <span className="font-medium text-ink-soft">{HOSTED.source.note}</span>
        </span>
      </div>

      {links.map(({ d, i, pos }) => (
        <div key={i} className="absolute" style={{ left: pct(pos.x, W), top: pct(pos.y, H), width: pct(128, W), transform: "translate(-50%,-50%)" }}>
          <div className="flex w-full flex-col items-center gap-1.5">
            <DeviceFrame kind={d.kind} shows={d.shows} delay={i * 0.9 + 3.3} />
            <span className="whitespace-nowrap text-[.7rem] font-semibold text-ink-soft">{d.who}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeviceFrame({ kind, shows, delay }: { kind: Device["kind"]; shows: ShowcaseId; delay: number }) {
  // Widths are a share of the device slot, so devices scale with the stage.
  // Screens are absolutely positioned inside fixed-ratio frames, so the site
  // mock can never inflate the device.
  const screen = (
    <div className="hosting__screen mock-frame absolute inset-[2px] overflow-hidden rounded-[inherit] bg-card" style={{ animationDelay: `${delay}s`, animationDuration: "3.6s" }}>
      <MockFor id={shows} />
    </div>
  );
  if (kind === "phone")
    return (
      <div className="relative w-[36%] overflow-hidden rounded-[10px] border-[3px] border-ink bg-ink shadow-lift" style={{ aspectRatio: "9 / 18" }}>{screen}</div>
    );
  if (kind === "tablet")
    return (
      <div className="relative w-[62%] overflow-hidden rounded-[9px] border-[3px] border-ink bg-ink shadow-lift" style={{ aspectRatio: "4 / 3" }}>{screen}</div>
    );
  if (kind === "laptop")
    return (
      <div className="flex w-full flex-col items-center">
        <div className="relative w-[82%] overflow-hidden rounded-t-[7px] border-[3px] border-b-0 border-ink bg-ink shadow-lift" style={{ aspectRatio: "16 / 10" }}>{screen}</div>
        <div className="h-[5px] w-[96%] rounded-b-[4px] bg-ink" />
      </div>
    );
  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-[90%] overflow-hidden rounded-[7px] border-[3px] border-ink bg-ink shadow-lift" style={{ aspectRatio: "16 / 10" }}>{screen}</div>
      <div className="h-[10px] w-[8px] bg-ink" />
      <div className="h-[3px] w-[44px] rounded-full bg-ink" />
    </div>
  );
}
