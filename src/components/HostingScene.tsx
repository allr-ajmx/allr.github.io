import { AllrMark } from "@/components/ui/AllrMark";
import { HOSTED } from "@/lib/brand";
import { PETALS } from "@/lib/petals";

/*
 * The hosting story as a living diagram. A new version leaves the workspace
 * (top-left), lands in the mark — the six petals are the servers that hold
 * it — and fans out to people's screens on the right. Packets travel the
 * lines: honey inward (a deploy), green outward (people getting the live
 * thing). Hosting is an ongoing state, so this one is allowed to loop, slowly.
 * SMIL animateMotion so it costs nothing; hidden under reduced motion.
 */

const W = 560;
const H = 440;
const C = { x: 250, y: 236 };
const SRC = { x: 96, y: 74 };
const VISITORS = [
  { x: 470, y: 78 },
  { x: 508, y: 168 },
  { x: 512, y: 268 },
  { x: 480, y: 358 },
  { x: 380, y: 404 },
];

function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

export function HostingScene() {
  const inbound = curve(SRC, C);
  return (
    <div className="mx-auto w-full max-w-[560px]">
    <div className="hosting relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="host-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f7c14c" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#f7c14c" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f7c14c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* lines */}
        <path d={inbound} className="hosting__line hosting__line--in" />
        {VISITORS.map((v, i) => (
          <path key={i} d={curve(C, v)} className="hosting__line hosting__line--out" />
        ))}

        {/* packets — honey in, green out */}
        {[0, 1].map((k) => (
          <circle key={`in-${k}`} r="4" className="hosting__packet hosting__packet--in">
            <animateMotion dur="3.6s" begin={`${k * 1.8}s`} repeatCount="indefinite" path={inbound} />
          </circle>
        ))}
        {VISITORS.map((v, i) => (
          <circle key={`out-${i}`} r="3.5" className="hosting__packet hosting__packet--out">
            <animateMotion dur="3.2s" begin={`${1.2 + i * 0.55}s`} repeatCount="indefinite" path={curve(C, v)} />
          </circle>
        ))}

        {/* halo behind the mark */}
        <circle cx={C.x} cy={C.y} r="120" fill="url(#host-halo)" className="hosting__halo" />

        {/* the servers: six petal nodes around the mark, each pulsing in turn */}
        {PETALS.map((p, i) => {
          const a = (p.angle * Math.PI) / 180;
          const r = 96;
          return (
            <circle
              key={p.id}
              cx={C.x + Math.cos(a) * r}
              cy={C.y + Math.sin(a) * r}
              r="5"
              fill={p.color}
              className="hosting__node"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          );
        })}
        <circle cx={C.x} cy={C.y} r="96" className="hosting__ring" />
      </svg>

      {/* the mark, dead centre */}
      <div className="absolute" style={{ left: `${(C.x / W) * 100}%`, top: `${(C.y / H) * 100}%`, width: `${(156 / W) * 100}%`, transform: "translate(-50%,-50%)" }}>
        <AllrMark size="100%" className="block h-auto" />
      </div>

      {/* source: the new version leaving the workspace */}
      <div className="absolute" style={{ left: `${(SRC.x / W) * 100}%`, top: `${(SRC.y / H) * 100}%`, transform: "translate(-50%,-50%)" }}>
        <div className="hosting__card w-[118px] rounded-card border border-paper/15 bg-paper/10 p-2 text-paper backdrop-blur sm:w-[150px] sm:p-2.5">
          <p className="mb-1 text-[.62rem] font-bold tracking-[0.08em] text-honey uppercase">Deploy · {HOSTED.source.version}</p>
          <p className="text-[.7rem] leading-snug sm:text-[.78rem]">{HOSTED.source.note}</p>
        </div>
      </div>

      {/* label under the mark */}
      <div className="absolute" style={{ left: `${(C.x / W) * 100}%`, top: `${((C.y + 118) / H) * 100}%`, transform: "translate(-50%,-50%)" }}>
        <p className="whitespace-nowrap text-[.68rem] font-bold tracking-[0.1em] text-paper/70 uppercase">{HOSTED.center}</p>
      </div>

      {/* visitors: screens lighting up */}
      {VISITORS.map((v, i) => (
        <div key={i} className="absolute" style={{ left: `${(v.x / W) * 100}%`, top: `${(v.y / H) * 100}%`, transform: "translate(-50%,-50%)" }}>
          <div className="hosting__visitor flex items-center gap-1.5" style={{ animationDelay: `${1.2 + i * 0.55 + 3.0}s` }}>
            <span className="flex h-[26px] w-[18px] items-center justify-center rounded-[4px] border border-paper/30 bg-paper/10">
              <span className="hosting__screen block h-[18px] w-[12px] rounded-[2px] bg-green" style={{ animationDelay: `${1.2 + i * 0.55 + 3.0}s` }} />
            </span>
            <span className="hidden whitespace-nowrap text-[.68rem] font-semibold text-paper/75 sm:block">{HOSTED.visitors[i]}</span>
          </div>
        </div>
      ))}
    </div>

      {/* the link, in flow so it never sits on a visitor */}
      <div className="mt-4 flex justify-center">
        <span className="inline-flex items-center gap-2 rounded-control border border-paper/20 bg-paper/10 px-3 py-1.5 font-mono text-[.8rem] text-paper backdrop-blur">
          <span className="live-ring size-1.5 rounded-full bg-green" />
          {HOSTED.url}
        </span>
      </div>
    </div>
  );
}
