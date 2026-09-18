"use client";

import { useState } from "react";
import { AllrMark } from "@/components/ui/AllrMark";
import { cx } from "@/lib/cx";

export interface PlaceholderImageProps {
  slotId: string;
  label: string;
  description?: string;
  badge?: string;
  dimensions?: string;
  aspectRatio?: string;
  petalHighlight?: number;
  petalRotate?: number;
  className?: string;
}

/**
 * PlaceholderImage — High-craft visual slot component.
 * Replaces legacy mockups. Supports loading real placeholder assets from
 * `/images/placeholders/${slotId}.png` or `/images/placeholders/${slotId}.svg`
 * while falling back to an elegant, tokenized blueprint/wireframe canvas
 * with the intact AllrMark.
 */
export function PlaceholderImage({
  slotId,
  label,
  description,
  badge = "Visual Asset Slot",
  dimensions,
  aspectRatio = "aspect-[16/10]",
  petalHighlight,
  petalRotate,
  className,
}: PlaceholderImageProps) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = `/images/placeholders/${slotId}.png`;

  return (
    <div
      className={cx(
        "placeholder-frame relative flex w-full flex-col overflow-hidden rounded-panel border border-line bg-card shadow-soft transition-all duration-300",
        aspectRatio,
        className,
      )}
      data-slot={slotId}
    >
      {/* Real image if provided & loaded */}
      {!imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={label}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : null}

      {/* Fallback elegant blueprint canvas */}
      {imgError && (
        <div className="relative flex h-full w-full flex-col justify-between p-5 sm:p-6">
          {/* Subtle blueprint grid backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "radial-gradient(var(--color-ink) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            aria-hidden="true"
          />

          {/* Top header bar */}
          <div className="relative z-10 flex items-center justify-between gap-3 border-b border-line-soft pb-3">
            <div className="flex items-center gap-2">
              <AllrMark
                size={22}
                highlight={petalHighlight}
                rotate={petalRotate}
              />
              <span className="font-mono text-[.78rem] font-bold tracking-[0.03em] text-ink-soft">
                {slotId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {dimensions ? (
                <span className="rounded-chip border border-line bg-paper px-2 py-0.5 font-mono text-[.7rem] text-ink-soft">
                  {dimensions}
                </span>
              ) : null}
              <span className="rounded-chip bg-honey-tint px-2 py-0.5 text-[.72rem] font-semibold text-honey-deep">
                {badge}
              </span>
            </div>
          </div>

          {/* Center visual emblem with intact logo */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center">
            <div className="mb-3 rounded-full border border-line-soft bg-paper/80 p-3 shadow-soft backdrop-blur-sm">
              <AllrMark
                size={44}
                highlight={petalHighlight}
                rotate={petalRotate}
              />
            </div>
            <h4 className="font-serif text-[clamp(1.1rem,1.8vw,1.35rem)] text-ink">
              {label}
            </h4>
            {description ? (
              <p className="mt-1.5 max-w-[42ch] text-[.88rem] leading-relaxed text-ink-soft">
                {description}
              </p>
            ) : null}
          </div>

          {/* Bottom status strip */}
          <div className="relative z-10 flex items-center justify-between border-t border-line-soft pt-2.5 text-[.75rem] text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-honey animate-pulse" />
              <span>Awaiting asset: {slotId}.png</span>
            </span>
            <span className="font-mono text-[.7rem] opacity-70">
              allr.work · preview
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
