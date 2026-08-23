"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";

/** Click-to-copy a token or hex. Used on the living spec so later work can grab values. */
export function CopyChip({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard can fail in insecure contexts; the value is still visible */
        }
      }}
      title={`Copy ${value}`}
      className={cx(
        "cursor-pointer rounded-chip border border-line-soft bg-paper px-2 py-0.5 font-mono text-[.72rem] font-semibold tracking-tight text-ink-soft transition-[background-color,border-color,color] duration-150 hover:border-honey-line hover:text-ink",
        copied && "border-green-line bg-green-tint text-green-deep",
        className,
      )}
    >
      {copied ? "copied" : (label ?? value)}
    </button>
  );
}
