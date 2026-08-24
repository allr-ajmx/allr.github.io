/**
 * Desktop builds. Every link here is a real asset on the GitHub release —
 * nothing else is linked from the download page.
 * Release: https://github.com/allr-ajmx/allr-agent/releases/tag/desktop-v0.0.7
 */
export const DESKTOP_VERSION = "0.0.7";
export const DESKTOP_RELEASED = "24 August 2026";

const BASE = `https://github.com/allr-ajmx/allr-agent/releases/download/desktop-v${DESKTOP_VERSION}`;

export type Platform = "macos" | "windows" | "linux";

export type Build = { label: string; file: string; href: string; note?: string };

export const PLATFORMS: Record<
  Platform,
  { name: string; requirements: string; builds: Build[] }
> = {
  macos: {
    name: "macOS",
    requirements: "Apple silicon and Intel — one universal build.",
    builds: [
      {
        label: "Download for macOS",
        file: `Allr-Setup_${DESKTOP_VERSION}_universal.dmg`,
        href: `${BASE}/Allr-Setup_${DESKTOP_VERSION}_universal.dmg`,
        note: "Universal .dmg",
      },
    ],
  },
  windows: {
    name: "Windows",
    requirements: "Windows 10 or later, 64-bit.",
    builds: [
      {
        label: "Download for Windows",
        file: `Allr-Setup_${DESKTOP_VERSION}_x64-setup.exe`,
        href: `${BASE}/Allr-Setup_${DESKTOP_VERSION}_x64-setup.exe`,
        note: "x64 installer (.exe)",
      },
    ],
  },
  linux: {
    name: "Linux",
    requirements: "x86-64. The AppImage runs on most distributions; the .deb is for Debian and Ubuntu.",
    builds: [
      {
        label: "Download AppImage",
        file: `Allr-Setup_${DESKTOP_VERSION}_amd64.AppImage`,
        href: `${BASE}/Allr-Setup_${DESKTOP_VERSION}_amd64.AppImage`,
        note: "amd64 .AppImage",
      },
      {
        label: "Download .deb",
        file: `Allr-Setup_${DESKTOP_VERSION}_amd64.deb`,
        href: `${BASE}/Allr-Setup_${DESKTOP_VERSION}_amd64.deb`,
        note: "amd64 .deb",
      },
    ],
  },
};

export const PLATFORM_ORDER: Platform[] = ["macos", "windows", "linux"];

/** Best guess at the visitor's platform from the UA; undefined if unsure. */
export function detectPlatform(ua: string): Platform | undefined {
  if (/Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return undefined;
}
