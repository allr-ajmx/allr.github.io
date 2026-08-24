import { MockFor } from "@/components/mocks/Mocks";
import { AllrMark } from "@/components/ui/AllrMark";
import { HOSTED } from "@/lib/brand";

import { PETALS, PETAL_PATH } from "@/lib/petals";

/*
 * Real-world deployment, drawn. The mark sits at the centre; around it six
 * petal-shaped server windows each hold a copy of the user's site — the app
 * lives *in* the petals. Beyond an "internet" ring, real devices (phones,
 * laptops, a tablet, a desktop) connect to the nearest petal and show the
 * same live site. A deploy card at the top-left feeds new versions in.
 * Packets: honey inward (deploy), green outward (people loading it).
 * Hosting is ongoing, so this loops slowly; static under reduced motion.
 */

const W = 1100;
const H = 640;
const C = { x: 550, y: 320 };
const PETAL_R = 158; // petal server windows
const RING_R = 262; // the internet

type Device = { kind: "phone" | "laptop" | "tablet" | "desktop"; x: number; y: number; who: string };
const DEVICES: Device[] = [
  { kind: "phone", x: 118, y: 120, who: "Mia · on the bus" },
  { kind: "laptop", x: 96, y: 330, who: "An investor" },
  { kind: "tablet", x: 150, y: 540, who: "A journalist" },
  { kind: "desktop", x: 985, y: 130, who: "The studio" },
  { kind: "phone", x: 1010, y: 335, who: "Fans" },
  { kind: "laptop", x: 950, y: 540, who: "A collaborator" },
];
const SRC = { x: 330, y: 62 };

const toXY = (deg: number, r: number) => ({
  x: C.x + Math.cos((deg * Math.PI) / 180) * r,
  y: C.y + Math.sin((deg * Math.PI) / 180) * r,
});

function nearestPetal(d: Device) {
  const a = (Math.atan2(d.y - C.y, d.x - C.x) * 180) / Math.PI;
  let best = PETALS[0];
  let bd = 999;
  for (const p of PETALS) {
    const diff = Math.abs((((a - p.angle) % 360) + 540) % 360 - 180);
    if (diff < bd) { bd = diff; best = p; }
  }
  return best;
}

function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function HostingScene() {
  const inbound = curve(SRC, toXY(PETALS[0].angle, PETAL_R));
  const links = DEVICES.map((d) => {
    const p = nearestPetal(d);
    return { d, p, path: curve(toXY(p.angle, PETAL_R), d) };
  });

  return (
    <div className="hosting relative mx-auto w-full max-w-[1100px]" style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id="petal-clip" clipPathUnits="objectBoundingBox">
            <path d={PETAL_PATH} />
          </clipPath>
          <radialGradient id="host-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f7c14c" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#f7c14c" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#f7c14c" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={C.x} cy={C.y} r={RING_R + 40} fill="url(#host-halo)" className="hosting__halo" />

        {/* the internet */}
        <circle cx={C.x} cy={C.y} r={RING_R} className="hosting__ring" />
        <text x={C.x} y={C.y - RING_R - 10} textAnchor="middle" className="hosting__label">the internet</text>

        {/* lines */}
        <path d={inbound} className="hosting__line hosting__line--in" />
        {links.map((l, i) => (
          <path key={i} d={l.path} className="hosting__line hosting__line--out" />
        ))}

        {/* packets */}
        {[0, 1].map((k) => (
          <circle key={`in-${k}`} r="4.5" className="hosting__packet hosting__packet--in">
            <animateMotion dur="3.6s" begin={`${k * 1.8}s`} repeatCount="indefinite" path={inbound} />
          </circle>
        ))}
        {links.map((l, i) => (
          <circle key={`out-${i}`} r="4" className="hosting__packet hosting__packet--out">
            <animateMotion dur="3.4s" begin={`${0.8 + i * 0.5}s`} repeatCount="indefinite" path={l.path} />
          </circle>
        ))}
      </svg>

      {/* the mark */}
      <div className="absolute" style={{ left: pct(C.x, W), top: pct(C.y, H), width: pct(150, W), transform: "translate(-50%,-50%)" }}>
        <AllrMark size="100%" className="block h-auto drop-shadow-[0_12px_30px_rgba(34,59,51,.18)]" />
      </div>

      {/* petal servers — the app lives here */}
      {PETALS.map((p, i) => {
        const at = toXY(p.angle, PETAL_R);
        return (
          <div
            key={p.id}
            className="absolute"
            style={{ left: pct(at.x, W), top: pct(at.y, H), width: pct(118, W), transform: `translate(-50%,-50%) rotate(${p.angle + 90}deg)` }}
          >
            <div className="hosting__server relative" style={{ aspectRatio: "1.46 / 1", ["--i" as string]: i }}>
              <div className="absolute inset-[-3%]" style={{ background: p.color, clipPath: "url(#petal-clip)" }} />
              <div className="mock-frame absolute inset-[6%] overflow-hidden bg-card" style={{ clipPath: "url(#petal-clip)" }}>
                <div className="h-full w-full" style={{ transform: `rotate(${-(p.angle + 90)}deg) scale(1.25)`, transformOrigin: "50% 50%" }}>
                  <MockFor id="websites" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* deploy source */}
      <div className="absolute" style={{ left: pct(SRC.x, W), top: pct(SRC.y, H), transform: "translate(-50%,-50%)" }}>
        <div className="hosting__card w-[150px] rounded-card border border-line bg-card p-2.5 shadow-soft">
          <p className="mb-0.5 text-[.62rem] font-bold tracking-[0.08em] text-honey-deep uppercase">You · deploy {HOSTED.source.version}</p>
          <p className="text-[.76rem] leading-snug text-ink">{HOSTED.source.note}</p>
        </div>
      </div>

      {/* devices */}
      {links.map(({ d }, i) => (
        <div key={i} className="absolute" style={{ left: pct(d.x, W), top: pct(d.y, H), transform: "translate(-50%,-50%)" }}>
          <div className="flex flex-col items-center gap-1.5">
            <DeviceFrame kind={d.kind} delay={0.8 + i * 0.5 + 3.2} />
            <span className="whitespace-nowrap text-[.7rem] font-semibold text-ink-soft">{d.who}</span>
          </div>
        </div>
      ))}

      {/* the link */}
      <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
        <span className="inline-flex items-center gap-2 rounded-control border border-green-line bg-card px-3 py-1.5 font-mono text-[.8rem] text-ink shadow-soft">
          <span className="live-ring size-1.5 rounded-full bg-green" />
          {HOSTED.url}
          <span className="rounded-chip bg-green px-2 py-0.5 text-[.62rem] font-bold tracking-[0.04em] text-white uppercase">Live</span>
        </span>
      </div>
    </div>
  );
}

function DeviceFrame({ kind, delay }: { kind: Device["kind"]; delay: number }) {
  const screen = (
    <div className="hosting__screen mock-frame h-full w-full overflow-hidden bg-card" style={{ animationDelay: `${delay}s` }}>
      <MockFor id="websites" />
    </div>
  );
  if (kind === "phone")
    return (
      <div className="w-[52px] rounded-[10px] border-[3px] border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "9 / 18" }}>
        <div className="h-full w-full overflow-hidden rounded-[7px]">{screen}</div>
      </div>
    );
  if (kind === "tablet")
    return (
      <div className="w-[84px] rounded-[9px] border-[3px] border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "4 / 3" }}>
        <div className="h-full w-full overflow-hidden rounded-[6px]">{screen}</div>
      </div>
    );
  if (kind === "laptop")
    return (
      <div className="flex flex-col items-center">
        <div className="w-[110px] rounded-t-[7px] border-[3px] border-b-0 border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "16 / 10" }}>
          <div className="h-full w-full overflow-hidden rounded-t-[4px]">{screen}</div>
        </div>
        <div className="h-[5px] w-[128px] rounded-b-[4px] bg-ink" />
      </div>
    );
  return (
    <div className="flex flex-col items-center">
      <div className="w-[124px] rounded-[7px] border-[3px] border-ink bg-ink p-[2px] shadow-lift" style={{ aspectRatio: "16 / 10" }}>
        <div className="h-full w-full overflow-hidden rounded-[4px]">{screen}</div>
      </div>
      <div className="h-[10px] w-[8px] bg-ink" />
      <div className="h-[3px] w-[44px] rounded-full bg-ink" />
    </div>
  );
}

