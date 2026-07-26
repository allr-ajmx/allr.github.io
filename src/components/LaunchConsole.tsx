"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cx } from "@/lib/cx";

const ASSETS = [
  { emoji: "📊", label: "Deck" },
  { emoji: "📄", label: "Doc" },
  { emoji: "🧮", label: "Spreadsheet" },
  { emoji: "🎬", label: "Video" },
  { emoji: "🌐", label: "Website" },
  { emoji: "🕹️", label: "App & game" },
] as const;

/** Encouraging status copy — the mentor voice. */
const MESSAGES = [
  "Setting things up for you…",
  "Your deck is ready. Nice start.",
  "Doc done. You’re on a roll.",
  "Formulas working. Halfway there.",
  "Video rendered. Looking good.",
  "Your site is up. One to go…",
  "Everything’s ready. You’re live. 🎉",
];

const STEP_MS = 800;
const CONFETTI_COLORS = ["#2E9E63", "#E9A83E", "#F6C56B", "#8FBF9F", "#1E7A49"];

/** Deterministic scatter — random values here would break hydration. */
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: 3 + ((i * 37) % 94),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: ((i * 13) % 50) / 100,
  duration: 1.3 + ((i * 7) % 9) / 10,
}));

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Whether the build-out should play at all. Reading this as an external store
 * (rather than in an effect) keeps the reduced-motion state derived instead of
 * written, so there is exactly one source of truth for what the console shows.
 * The server snapshot is `true`, which renders the pre-animation state.
 */
function useShouldAnimate() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => !window.matchMedia(MOTION_QUERY).matches,
    () => true,
  );
}

export function LaunchConsole() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldAnimate = useShouldAnimate();
  const [started, setStarted] = useState(false);
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(0);
  const [working, setWorking] = useState(-1);
  const [finished, setFinished] = useState(false);

  // Kick the sequence off the first time the console scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !shouldAnimate || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setStarted(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px 15% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shouldAnimate]);

  // Schedule the build-out. Every timer is cleared on teardown, so React's
  // double-mount in development is harmless.
  useEffect(() => {
    if (!started || !shouldAnimate) return;

    const timers: number[] = [];

    ASSETS.forEach((_, i) => {
      timers.push(window.setTimeout(() => setWorking(i), 400 + i * STEP_MS));
      timers.push(
        window.setTimeout(
          () => {
            setWorking(-1);
            setDone(i + 1);
            if (i === ASSETS.length - 1) {
              timers.push(window.setTimeout(() => setFinished(true), 380));
            }
          },
          400 + i * STEP_MS + STEP_MS * 0.88,
        ),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [started, run, shouldAnimate]);

  const replay = useCallback(() => {
    setDone(0);
    setWorking(-1);
    setFinished(false);
    setStarted(true);
    setRun((n) => n + 1);
  }, []);

  // With motion suppressed the console simply shows its finished state.
  const doneCount = shouldAnimate ? done : ASSETS.length;
  const workingIndex = shouldAnimate ? working : -1;
  const live = shouldAnimate ? finished : true;
  const status = MESSAGES[live ? 6 : Math.min(doneCount, MESSAGES.length - 2)];

  return (
    <div className="@container relative mx-auto w-full max-w-[720px]">
      {/* soft pedestal shadow under the console */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[10%] -bottom-2 h-8 rounded-[50%] bg-[radial-gradient(closest-side,rgba(34,59,51,.12),transparent_70%)] blur-[2px]"
      />
      <div
        ref={ref}
        aria-label="Demo: Allr generating a project"
        className={cx(
          "relative overflow-hidden rounded-card border bg-card text-left transition-[border-color,box-shadow] duration-[600ms]",
          live
            ? "border-green-line shadow-[0_20px_50px_rgba(46,158,99,.14),0_0_0_4px_rgba(46,158,99,.06)]"
            : "border-line shadow-lift",
        )}
      >
        {live ? (
          <div
            key={run}
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-card"
            aria-hidden="true"
          >
            {CONFETTI.map((piece, i) => (
              <i
                key={i}
                className="absolute -top-[14px] h-[11px] w-[7px] animate-fall rounded-[2px] opacity-0"
                style={{
                  left: `${piece.left}%`,
                  background: piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                }}
              />
            ))}
          </div>
        ) : null}

        {/* browser chrome */}
        <div className="flex items-center gap-3 border-b border-line-soft bg-paper/50 px-4 py-3">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#EFC1A9]" />
            <span className="size-2.5 rounded-full bg-[#F2D49A]" />
            <span className="size-2.5 rounded-full bg-[#BFDCC7]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-control border border-line-soft bg-card px-3 py-1.5 text-[.85rem] font-semibold text-ink-soft">
            <span
              className={cx(
                "size-1.5 shrink-0 rounded-full transition-colors duration-[350ms]",
                live ? "bg-green" : "bg-honey",
              )}
            />
            <span className="truncate font-mono text-[.82rem] tracking-tight">
              allr.app/your-launch
            </span>
          </div>
          <span
            className={cx(
              "shrink-0 rounded-chip bg-green px-2.5 py-1 text-[.75rem] font-bold tracking-[0.04em] text-white uppercase transition-[opacity,transform] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
              live ? "live-pulse scale-100 opacity-100" : "scale-[.9] opacity-0",
            )}
          >
            Live
          </span>
        </div>

        {/* the assets being built — modern tiles, not bubble pills */}
        <div className="px-4 pt-4 pb-1 sm:px-5 sm:pt-5">
          <div className="grid grid-cols-2 gap-2 @[34rem]:grid-cols-3">
            {ASSETS.map((asset, i) => (
              <AssetTile
                key={asset.label}
                emoji={asset.emoji}
                label={asset.label}
                state={
                  i < doneCount
                    ? "done"
                    : i === workingIndex
                      ? "working"
                      : "idle"
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-5 sm:px-5">
          <span
            className={cx(
              "flex min-h-[32px] items-center gap-2.5 text-[.92rem] font-semibold",
              live ? "text-green-deep" : "text-ink-soft",
            )}
          >
            <span className="rounded-chip border border-line-soft bg-paper px-2 py-0.5 font-mono text-[.78rem] tabular-nums">
              {doneCount}/{ASSETS.length}
            </span>
            <span>{status}</span>
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={replay}
              className={cx(
                "cursor-pointer p-1 text-[.9rem] font-semibold text-honey-deep underline underline-offset-[3px] transition-opacity duration-300",
                live ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              Watch again
            </button>
            <a
              href="#final"
              className={cx(
                "inline-flex items-center justify-center gap-2 rounded-control bg-green px-4 py-2.5 text-[.92rem] font-bold text-white no-underline shadow-[0_8px_20px_rgba(46,158,99,.28)]",
                "transition-[opacity,transform,background-color] duration-[350ms] ease-[cubic-bezier(.22,1,0.36,1)] hover:bg-green-deep",
                live
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1.5 opacity-0",
              )}
            >
              Visit your project →
            </a>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[.9rem] font-medium text-ink-soft">
        Watch a project come to life — when every tile turns green, you&rsquo;re
        live.
      </p>
    </div>
  );
}

function AssetTile({
  emoji,
  label,
  state,
}: {
  emoji: string;
  label: string;
  state: "idle" | "working" | "done";
}) {
  return (
    <div
      className={cx(
        "flex items-center gap-2.5 rounded-control border px-3 py-2.5 transition-[background-color,border-color,color,box-shadow] duration-[400ms]",
        state === "done" &&
          "animate-pop border-green-line bg-green-tint text-green-deep shadow-[0_0_0_1px_rgba(46,158,99,.06)]",
        state === "working" &&
          "border-honey-line bg-honey-tint text-honey-deep",
        state === "idle" && "border-line-soft bg-paper/80 text-ink-soft",
      )}
    >
      <span
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-chip text-[1rem]",
          state === "done" && "bg-card/70",
          state === "working" && "bg-card/60",
          state === "idle" && "bg-card",
        )}
        aria-hidden="true"
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1 text-[.9rem] font-semibold tracking-[-0.01em]">
        {label}
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center">
        {state === "working" ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-honey" />
        ) : null}
        {state === "done" ? (
          <span className="flex size-5 items-center justify-center rounded-chip bg-green text-[.65rem] font-bold text-white">
            ✓
          </span>
        ) : null}
      </span>
    </div>
  );
}
