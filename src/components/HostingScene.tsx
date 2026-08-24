import { MockFor } from "@/components/mocks/Mocks";
import { HOSTED } from "@/lib/brand";
import { PETALS, PETAL_PATH } from "@/lib/petals";

/*
 * Hosting, one-directional: the six petals stand around a globe — the
 * internet — and each petal is drawn as a server (rack slots, a status LED).
 * From there, petals themselves travel the wires to the devices on the right,
 * and each screen lights as its petal lands. Hosting is ongoing, so it loops
 * slowly; under reduced motion nothing flies and every screen is lit.
 */

const W = 640;
const H = 680;
const G = { x: 190, y: 350 }; // globe centre
const GLOBE_R = 138;
const SERVER_R = 92; // petal servers sit inside the globe
const PW = 64; // petal server size (local frame, pointing up)
const PH = 44;

type Device = { kind: "phone" | "laptop" | "tablet" | "desktop"; y: number; who: string; petal: number };
const DEVICES: Device[] = [
  { kind: "phone", y: 92, who: "Mia · on the bus", petal: 1 },
  { kind: "laptop", y: 262, who: "An investor", petal: 2 },
  { kind: "tablet", y: 420, who: "A journalist", petal: 3 },
  { kind: "desktop", y: 586, who: "The studio", petal: 4 },
];
const DEVICE_X = 560;
const DEPLOY = { x: 190, y: 56 };

/** Rings of tiny petals that make the globe: radius, count, size, speed. */
const ORBITS = [
  { r: 138, n: 34, s: 9, dur: 90, dir: "normal", offset: 0, alpha: 0.55 },
  { r: 124, n: 28, s: 8, dur: 70, dir: "reverse", offset: 7, alpha: 0.45 },
  { r: 58, n: 12, s: 7, dur: 40, dir: "normal", offset: 15, alpha: 0.6 },
  { r: 42, n: 8, s: 6, dur: 28, dir: "reverse", offset: 0, alpha: 0.7 },
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
    const p = PETALS[d.petal];
    const from = toXY(p.angle, SERVER_R + 26);
    const exit = toXY(p.angle, GLOBE_R);
    return { d, p, i, path: `M${from.x},${from.y} L${exit.x},${exit.y} ` + wire(exit, { x: DEVICE_X - 70, y: d.y }).slice(1) };
  });
  const inbound = `M${DEPLOY.x},${DEPLOY.y + 22} L${G.x},${G.y - GLOBE_R + 4}`;

  return (
    <div className="hosting relative mx-auto w-full max-w-[600px]" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="globe-fill" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e4f4ea" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        {/* the internet — a globe made of tiny petals, each ring turning */}
        <circle cx={G.x} cy={G.y} r={GLOBE_R} fill="url(#globe-fill)" />
        {ORBITS.map((o, ri) => (
          <g
            key={ri}
            className="hosting__orbit"
            style={{ transformOrigin: `${G.x}px ${G.y}px`, animationDuration: `${o.dur}s`, animationDirection: o.dir }}
          >
            {Array.from({ length: o.n }, (_, k) => {
              const a = (k / o.n) * 360 + o.offset;
              const at = toXY(a, o.r);
              const c = PETALS[(k + ri) % PETALS.length].color;
              return (
                <path
                  key={k}
                  d={PETAL_PATH}
                  fill={c}
                  opacity={o.alpha}
                  transform={`translate(${at.x} ${at.y}) rotate(${a + 90}) translate(${-o.s / 2} ${-o.s / 2.9}) scale(${o.s} ${o.s / 1.46})`}
                />
              );
            })}
          </g>
        ))}
        <text x={G.x} y={G.y + GLOBE_R + 26} textAnchor="middle" className="hosting__label">{HOSTED.center} · the internet</text>

        {/* wires */}
        <path d={inbound} className="hosting__line hosting__line--in" />
        {links.map((l) => (
          <path key={l.i} d={l.path} className="hosting__line hosting__line--out" />
        ))}

        {/* petal servers */}
        {PETALS.map((p, i) => {
          const at = toXY(p.angle, SERVER_R);
          return (
            <g key={p.id} className="hosting__server" transform={`translate(${at.x} ${at.y}) rotate(${p.angle + 90})`}>
              <g transform={`translate(${-PW / 2} ${-PH / 2})`}>
                <path d={PETAL_PATH} transform={`scale(${PW} ${PH})`} fill={p.color} />
                {[0.46, 0.58, 0.7].map((t) => (
                  <rect key={t} x={PW * 0.3} y={PH * t} width={PW * 0.4} height={PH * 0.06} rx={PH * 0.03} fill="rgba(255,255,255,.55)" />
                ))}
                <circle cx={PW * 0.5} cy={PH * 0.3} r={PH * 0.06} fill="#fff" className="hosting__led" style={{ animationDelay: `${i * 0.4}s` }} />
              </g>
            </g>
          );
        })}
        <circle cx={G.x} cy={G.y} r={26} fill="#fbf1e2" stroke="rgba(183,126,31,.5)" strokeWidth="1.2" />
        <text x={G.x} y={G.y + 5} textAnchor="middle" className="hosting__wordmark">allr</text>

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

      {links.map(({ d, i }) => (
        <div key={i} className="absolute" style={{ left: pct(DEVICE_X, W), top: pct(d.y, H), width: pct(116, W), transform: "translate(-50%,-50%)" }}>
          <div className="flex w-full flex-col items-center gap-1.5">
            <DeviceFrame kind={d.kind} delay={i * 0.9 + 3.3} />
            <span className="whitespace-nowrap text-[.7rem] font-semibold text-ink-soft">{d.who}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeviceFrame({ kind, delay }: { kind: Device["kind"]; delay: number }) {
  // Widths are a share of the device slot, so devices scale with the stage.
  const screen = (
    <div className="hosting__screen mock-frame h-full w-full overflow-hidden bg-card" style={{ animationDelay: `${delay}s`, animationDuration: "3.6s" }}>
      <MockFor id="websites" />
    </div>
  );
  if (kind === "phone")
    return (
      <div className="w-[36%] rounded-[10px] border-[3px] border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "9 / 18" }}>
        <div className="h-full w-full overflow-hidden rounded-[7px]">{screen}</div>
      </div>
    );
  if (kind === "tablet")
    return (
      <div className="w-[62%] rounded-[9px] border-[3px] border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "4 / 3" }}>
        <div className="h-full w-full overflow-hidden rounded-[6px]">{screen}</div>
      </div>
    );
  if (kind === "laptop")
    return (
      <div className="flex w-full flex-col items-center">
        <div className="w-[82%] rounded-t-[7px] border-[3px] border-b-0 border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "16 / 10" }}>
          <div className="h-full w-full overflow-hidden rounded-t-[4px]">{screen}</div>
        </div>
        <div className="h-[5px] w-[96%] rounded-b-[4px] bg-ink" />
      </div>
    );
  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-[90%] rounded-[7px] border-[3px] border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "16 / 10" }}>
        <div className="h-full w-full overflow-hidden rounded-[4px]">{screen}</div>
      </div>
      <div className="h-[10px] w-[8px] bg-ink" />
      <div className="h-[3px] w-[44px] rounded-full bg-ink" />
    </div>
  );
}
