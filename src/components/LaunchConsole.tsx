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
      { threshold: 0.4 },
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
    <div className="relative mx-auto max-w-[720px]">
      <div
        ref={ref}
        aria-label="Demo: Allr generating a project"
        className={cx(
          "relative overflow-hidden rounded-card border-[1.5px] bg-card text-left transition-[border-color,box-shadow] duration-[600ms]",
          live
            ? "border-green-line shadow-[0_24px_60px_rgba(46,158,99,.16),0_0_0_6px_rgba(46,158,99,.07)]"
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
                className="absolute -top-[14px] h-[13px] w-[9px] animate-fall rounded-[3px] opacity-0"
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
        <div className="flex items-center gap-3 border-b-[1.5px] border-line-soft px-[18px] py-3.5">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#EFC1A9]" />
            <span className="size-2.5 rounded-full bg-[#F2D49A]" />
            <span className="size-2.5 rounded-full bg-[#BFDCC7]" />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-[.55em] rounded-full border-[1.5px] border-line-soft bg-paper px-4 py-[.38em] text-[.88rem] font-extrabold text-ink-soft">
            <span
              className={cx(
                "size-[.6em] shrink-0 rounded-full transition-colors duration-[350ms]",
                live ? "bg-green" : "bg-honey",
              )}
            />
            <span className="truncate">allr.app/your-launch</span>
          </div>
          <span
            className={cx(
              "shrink-0 rounded-full bg-green px-4 py-[.32em] text-[.85rem] font-extrabold text-white transition-[opacity,transform] duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
              live ? "scale-100 opacity-100" : "scale-[.6] opacity-0",
            )}
          >
            ● Live
          </span>
        </div>

        {/* the assets being built */}
        <div className="px-[26px] pt-[26px] pb-2">
          <div className="grid grid-cols-2 gap-3 min-[641px]:grid-cols-3">
            {ASSETS.map((asset, i) => (
              <AssetPill
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

        <div className="flex flex-wrap items-center justify-between gap-3.5 px-[26px] pt-[18px] pb-6">
          <span
            className={cx(
              "flex min-h-[34px] items-center gap-[.65em] font-extrabold",
              live ? "text-green-deep" : "text-ink-soft",
            )}
          >
            <span className="rounded-full border-[1.5px] border-line-soft bg-paper px-[.85em] py-[.12em] text-[.85rem]">
              {doneCount} / {ASSETS.length}
            </span>
            <span>{status}</span>
          </span>

          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={replay}
              className={cx(
                "cursor-pointer p-1 font-extrabold text-honey-deep underline underline-offset-[3px] transition-opacity duration-300",
                live ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              Watch again
            </button>
            <a
              href="#final"
              className={cx(
                "inline-flex items-center justify-center gap-2 rounded-full bg-green px-[1.8em] py-[.85em] font-extrabold text-white no-underline shadow-[0_10px_24px_rgba(46,158,99,.30)]",
                "transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(.34,1.56,.64,1)] hover:bg-green-deep",
                live
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-2 opacity-0",
              )}
            >
              Visit your project →
            </a>
          </div>
        </div>
      </div>

      <p className="mt-[18px] text-center text-[.95rem] font-bold text-ink-soft">
        Watch a project come to life — when every pill turns green, you&rsquo;re
        live.
      </p>
    </div>
  );
}

function AssetPill({
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
        "flex items-center gap-2.5 rounded-full border-[1.5px] px-4 py-2.5 font-extrabold transition-[background-color,border-color,color] duration-[450ms]",
        state === "done" &&
          "animate-pop border-green-line bg-green-tint text-green-deep",
        state === "working" &&
          "border-honey-line bg-honey-tint text-honey-deep",
        state === "idle" && "border-line bg-paper text-ink-soft",
      )}
    >
      <span className="shrink-0 text-[1.1rem]" aria-hidden="true">
        {emoji}
      </span>
      <span className="min-w-0 flex-1 text-[.95rem]">{label}</span>
      <span className="flex size-[22px] shrink-0 items-center justify-center">
        {state === "working" ? (
          <span className="size-[15px] animate-spin rounded-full border-[3px] border-line border-t-honey" />
        ) : null}
        {state === "done" ? (
          <span className="flex size-[22px] items-center justify-center rounded-full bg-green text-[.72rem] font-black text-white">
            ✓
          </span>
        ) : null}
      </span>
    </div>
  );
}
