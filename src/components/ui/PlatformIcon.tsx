import type { Platform } from "@/lib/downloads";

/** Monochrome platform glyphs, drawn in currentColor. */
export function PlatformIcon({ platform, size = 18, className }: { platform: Platform | "mobile"; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true, className };
  switch (platform) {
    case "macos":
      return (
        <svg {...common}>
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      );
    case "windows":
      return (
        <svg {...common}>
          <path d="M3 5.6 10.6 4.55v7.05H3zM11.5 4.4 21 3.1v8.5h-9.5zM3 12.45h7.6v7.05L3 18.45zM11.5 12.45H21v8.45l-9.5-1.35z" />
        </svg>
      );
    case "linux":
      return (
        <svg {...common}>
          <path d="M12 2c-2.2 0-3.6 1.8-3.6 4.2 0 1-.3 1.9-.8 2.8C6.7 10.5 5.4 12.4 5.4 14.6c0 .7.1 1.3.3 1.9-.9.5-1.6 1.2-1.6 2 0 1.1 1.6 1.9 3.6 2.2.6.8 1.7 1.3 2.9 1.3h2.8c1.2 0 2.3-.5 2.9-1.3 2-.3 3.6-1.1 3.6-2.2 0-.8-.7-1.5-1.6-2 .2-.6.3-1.2.3-1.9 0-2.2-1.3-4.1-2.2-5.6-.5-.9-.8-1.8-.8-2.8C15.6 3.8 14.2 2 12 2zm-1.6 4.5c.5 0 .8.5.8 1s-.3 1-.8 1-.8-.5-.8-1 .3-1 .8-1zm3.2 0c.5 0 .8.5.8 1s-.3 1-.8 1-.8-.5-.8-1 .3-1 .8-1zM12 8.8c1 0 2 .5 2 1 0 .4-1 1-2 1s-2-.6-2-1c0-.5 1-1 2-1zm-2.6 3.1c1.1 1.1 1.8 2.7 1.8 4.4v3.6h-1.3c-.9 0-1.6-.4-2-1 .4-.6.6-1.3.6-2.1 0-1.9-.5-3.5.9-4.9zm5.2 0c1.4 1.4.9 3 .9 4.9 0 .8.2 1.5.6 2.1-.4.6-1.1 1-2 1h-1.3v-3.6c0-1.7.7-3.3 1.8-4.4z" />
        </svg>
      );
    case "mobile":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
          <path d="M10.5 18.5h3" />
        </svg>
      );
  }
}
