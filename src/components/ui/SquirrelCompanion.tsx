"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cx } from "@/lib/cx";

export type PetAnimationName =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "thinking"
  | "review";

interface AnimationStateDef {
  name: PetAnimationName;
  row: number;
  frames: number;
  speed: number;
}

const ANIMATION_STATES: Record<PetAnimationName, AnimationStateDef> = {
  idle: { name: "idle", row: 0, frames: 6, speed: 140 },
  "running-right": { name: "running-right", row: 1, frames: 8, speed: 100 },
  "running-left": { name: "running-left", row: 2, frames: 8, speed: 100 },
  waving: { name: "waving", row: 3, frames: 4, speed: 130 },
  jumping: { name: "jumping", row: 4, frames: 5, speed: 110 },
  failed: { name: "failed", row: 5, frames: 8, speed: 120 },
  waiting: { name: "waiting", row: 6, frames: 6, speed: 130 },
  thinking: { name: "thinking", row: 7, frames: 6, speed: 120 },
  review: { name: "review", row: 8, frames: 6, speed: 130 },
};

/**
 * Maps the 6 lifecycle steps (0 to 5) to the most meaningful companion animation
 */
const STEP_TO_ANIMATION: Record<number, PetAnimationName> = {
  0: "thinking", // Ideate: spinning happily on the flower mark
  1: "waiting",  // Create: monitoring code compilation
  2: "jumping",  // Deploy: celebrating the live release
  3: "idle",     // Operate: calm vigilance as daemon runs
  4: "review",   // Maintain: inspecting telemetry & VU meters
  5: "waving",   // Scale: waving as the product launches to the world
};

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;

export interface SquirrelCompanionProps {
  /** Optional explicit animation state */
  state?: PetAnimationName;
  /** Automatically resolves state based on active story step index (0-5) */
  stepIndex?: number;
  /** Width in pixels (default 48px; height is automatically proportional) */
  size?: number;
  /** If true, hover and click triggers playful gestures */
  interactive?: boolean;
  className?: string;
}

/**
 * SquirrelCompanion — Animated pixel-art mascot companion.
 * Renders the official spritesheet onto a pixel-sharp canvas with context-aware animations.
 */
export function SquirrelCompanion({
  state,
  stepIndex,
  size = 48,
  interactive = true,
  className,
}: SquirrelCompanionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [temporaryState, setTemporaryState] = useState<PetAnimationName | null>(null);

  // Determine active animation state
  let currentStateName: PetAnimationName = "idle";
  if (temporaryState) {
    currentStateName = temporaryState;
  } else if (isHovered && interactive) {
    currentStateName = "waving";
  } else if (state) {
    currentStateName = state;
  } else if (typeof stepIndex === "number" && STEP_TO_ANIMATION[stepIndex]) {
    currentStateName = STEP_TO_ANIMATION[stepIndex];
  }

  const height = Math.round(size * (CELL_HEIGHT / CELL_WIDTH));

  const handleClick = useCallback(() => {
    if (!interactive) return;
    setTemporaryState("jumping");
    setTimeout(() => {
      setTemporaryState(null);
    }, 1200);
  }, [interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crisp pixel art rendering
    ctx.imageSmoothingEnabled = false;

    const img = new Image();
    img.src = "/images/squirrel-spritesheet.webp";

    let currentFrame = 0;
    let timerId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const animDef = ANIMATION_STATES[currentStateName] ?? ANIMATION_STATES.idle;

    const draw = () => {
      if (isCancelled || !img.complete) return;

      const row = animDef.row;
      const col = currentFrame % animDef.frames;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        col * CELL_WIDTH,
        row * CELL_HEIGHT,
        CELL_WIDTH,
        CELL_HEIGHT,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      currentFrame = (currentFrame + 1) % animDef.frames;
      timerId = setTimeout(draw, animDef.speed);
    };

    if (img.complete) {
      draw();
    } else {
      img.onload = () => {
        if (!isCancelled) draw();
      };
    }

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [currentStateName]);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      className={cx(
        "relative inline-block transition-transform duration-200 select-none",
        interactive && "cursor-pointer hover:scale-105 active:scale-95",
        className,
      )}
      style={{ width: size, height }}
      title={interactive ? "Allr Companion · Click to celebrate!" : "Allr Companion"}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={height}
        style={{ imageRendering: "pixelated" }}
        className="block drop-shadow-sm"
      />
    </div>
  );
}
