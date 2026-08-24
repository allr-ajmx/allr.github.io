const COLORS = ["#2E9E63", "#E9A83E", "#F6C56B", "#8FBF9F", "#1E7A49"];

/** Deterministic scatter — random values here would break hydration. */
const PIECES = Array.from({ length: 24 }, (_, i) => ({
  left: 3 + ((i * 37) % 94),
  color: COLORS[i % COLORS.length],
  delay: ((i * 13) % 50) / 100,
  duration: 1.3 + ((i * 7) % 9) / 10,
}));

/**
 * 24 paper-fibre chips, green and honey only, falling once (MOTION.md §5.1).
 * Mount with a changing `key` to replay.
 */
export function Confetti() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {PIECES.map((p, i) => (
        <i
          key={i}
          className="absolute -top-[14px] h-[11px] w-[7px] animate-fall rounded-[2px] opacity-0"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
