/**
 * Fixed atmospheric layer for the whole page.
 * Warm evening paper: mesh color, lamplight rays, soft geometry, drifting motes.
 */
export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* base — richer than flat paper */}
      <div className="absolute inset-0 bg-[#fdfcf9]" />
      <div className="ambient-mesh absolute inset-0 opacity-50" />

      {/* soft diagonal ribbons for depth */}
      <div className="ambient-ribbons absolute inset-0 opacity-30" />

      {/* large color blooms — masked away from the centre column */}
      <div className="ambient-edges absolute inset-0 opacity-35">
      <span className="ambient-orb ambient-orb--a absolute -top-[18%] left-[-8%] size-[min(72vw,760px)] rounded-full bg-[radial-gradient(circle,rgba(233,168,62,0.38)_0%,rgba(233,168,62,0.12)_42%,transparent_70%)] blur-[2px]" />
      <span className="ambient-orb ambient-orb--b absolute top-[12%] right-[-14%] size-[min(78vw,820px)] rounded-full bg-[radial-gradient(circle,rgba(46,158,99,0.22)_0%,rgba(46,158,99,0.07)_45%,transparent_72%)] blur-[1px]" />
      <span className="ambient-orb ambient-orb--c absolute top-[48%] left-[-12%] size-[min(60vw,640px)] rounded-full bg-[radial-gradient(circle,rgba(246,197,107,0.28)_0%,transparent_68%)]" />
      <span className="ambient-orb ambient-orb--d absolute bottom-[-10%] right-[8%] size-[min(68vw,700px)] rounded-full bg-[radial-gradient(circle,rgba(30,122,73,0.16)_0%,rgba(34,59,51,0.05)_50%,transparent_72%)]" />
      </div>

      {/* lamplight beams from top */}
      <div className="ambient-beams absolute inset-0 opacity-40" />

      {/* concentric rings + soft grid geometry */}
      <svg
        className="ambient-geometry ambient-edges absolute inset-0 h-full w-full opacity-[0.4]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="ringFade" cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#223B33" stopOpacity="0.14" />
            <stop offset="55%" stopColor="#223B33" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#223B33" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="arcStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9A83E" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#2E9E63" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#E9A83E" stopOpacity="0" />
          </linearGradient>
          <pattern
            id="softGrid"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M56 0H0V56"
              fill="none"
              stroke="#223B33"
              strokeOpacity="0.045"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="gridMaskGrad" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="70%" stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="gridMask">
            <rect width="100%" height="100%" fill="url(#gridMaskGrad)" />
          </mask>
        </defs>

        <rect width="100%" height="100%" fill="url(#softGrid)" mask="url(#gridMask)" />

        {/* large decorative rings — centered upper third */}
        <g className="ambient-rings" fill="none" stroke="url(#arcStroke)">
          <circle cx="72%" cy="18%" r="180" strokeWidth="1.2" opacity="0.55" />
          <circle cx="72%" cy="18%" r="260" strokeWidth="1" opacity="0.4" />
          <circle cx="72%" cy="18%" r="340" strokeWidth="0.8" opacity="0.28" />
          <circle cx="18%" cy="78%" r="200" strokeWidth="1" opacity="0.35" />
          <circle cx="18%" cy="78%" r="290" strokeWidth="0.8" opacity="0.22" />
        </g>

        {/* soft arc flourishes — viewBox-free, scaled via large absolute coords */}
        <path
          d="M-80 280 C 220 60, 420 160, 780 40"
          fill="none"
          stroke="#E9A83E"
          strokeOpacity="0.14"
          strokeWidth="1.6"
        />
        <path
          d="M 120 920 C 380 560, 620 760, 1100 420"
          fill="none"
          stroke="#2E9E63"
          strokeOpacity="0.11"
          strokeWidth="1.6"
        />
        <path
          d="M 900 -40 C 700 180, 980 260, 1280 120"
          fill="none"
          stroke="#E9A83E"
          strokeOpacity="0.1"
          strokeWidth="1.4"
        />
      </svg>

      {/* dual-scale paper texture */}
      <div className="ambient-grain ambient-grain--fine absolute inset-0 opacity-[0.4]" />
      <div className="ambient-grain ambient-grain--fiber absolute inset-0 opacity-[0.18]" />

      {/* floating lamplight motes */}
      <div className="ambient-motes absolute inset-0">
        {MOTES.map((mote) => (
          <span
            key={mote.id}
            className="ambient-mote absolute rounded-full"
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.size,
              background: mote.color,
              opacity: mote.opacity,
              animationDelay: mote.delay,
              animationDuration: mote.duration,
            }}
          />
        ))}
      </div>

      {/* vignette — keeps focus on content */}
      <div className="ambient-vignette absolute inset-0" />
    </div>
  );
}

/** Deterministic mote scatter — no Math.random (hydration-safe). */
const MOTES = [
  { id: 0, left: "8%", top: "14%", size: 3, color: "#E9A83E", opacity: 0.45, delay: "0s", duration: "11s" },
  { id: 1, left: "18%", top: "32%", size: 2, color: "#F6C56B", opacity: 0.35, delay: "1.2s", duration: "14s" },
  { id: 2, left: "28%", top: "8%", size: 4, color: "#E9A83E", opacity: 0.28, delay: "0.4s", duration: "12s" },
  { id: 3, left: "42%", top: "22%", size: 2, color: "#2E9E63", opacity: 0.3, delay: "2.1s", duration: "15s" },
  { id: 4, left: "55%", top: "12%", size: 3, color: "#F6C56B", opacity: 0.4, delay: "0.8s", duration: "13s" },
  { id: 5, left: "68%", top: "28%", size: 2, color: "#E9A83E", opacity: 0.32, delay: "1.6s", duration: "16s" },
  { id: 6, left: "78%", top: "16%", size: 5, color: "#E9A83E", opacity: 0.22, delay: "0.2s", duration: "12s" },
  { id: 7, left: "88%", top: "38%", size: 2, color: "#2E9E63", opacity: 0.28, delay: "2.8s", duration: "14s" },
  { id: 8, left: "12%", top: "58%", size: 3, color: "#F6C56B", opacity: 0.3, delay: "1s", duration: "15s" },
  { id: 9, left: "24%", top: "72%", size: 2, color: "#E9A83E", opacity: 0.25, delay: "3.2s", duration: "13s" },
  { id: 10, left: "36%", top: "48%", size: 4, color: "#2E9E63", opacity: 0.2, delay: "0.6s", duration: "17s" },
  { id: 11, left: "48%", top: "64%", size: 2, color: "#F6C56B", opacity: 0.35, delay: "2.4s", duration: "12s" },
  { id: 12, left: "62%", top: "52%", size: 3, color: "#E9A83E", opacity: 0.28, delay: "1.4s", duration: "14s" },
  { id: 13, left: "74%", top: "68%", size: 2, color: "#2E9E63", opacity: 0.25, delay: "0.9s", duration: "16s" },
  { id: 14, left: "86%", top: "58%", size: 4, color: "#F6C56B", opacity: 0.22, delay: "2s", duration: "11s" },
  { id: 15, left: "6%", top: "84%", size: 3, color: "#E9A83E", opacity: 0.28, delay: "1.8s", duration: "15s" },
  { id: 16, left: "52%", top: "88%", size: 2, color: "#2E9E63", opacity: 0.22, delay: "3s", duration: "13s" },
  { id: 17, left: "92%", top: "78%", size: 3, color: "#E9A83E", opacity: 0.3, delay: "0.5s", duration: "14s" },
  { id: 18, left: "33%", top: "18%", size: 2, color: "#F6C56B", opacity: 0.38, delay: "2.6s", duration: "12s" },
  { id: 19, left: "70%", top: "42%", size: 3, color: "#E9A83E", opacity: 0.26, delay: "1.1s", duration: "15s" },
];
