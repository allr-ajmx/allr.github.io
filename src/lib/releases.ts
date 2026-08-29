/**
 * The latest desktop release, read from the public GitHub Releases API.
 *
 * This is the only source of download links on the site. Nothing here is
 * hand-written per version, so a new release reaches the site without a code
 * change.
 *
 * The site is a static export (`output: "export"`), so there is no server at
 * request time and this module is used twice:
 *
 * 1. At build time, from the `/app` and `/download` server components, so the
 *    exported HTML ships a real version and real asset URLs and works with no
 *    JavaScript at all.
 * 2. At runtime, from `DownloadRow`, so a release published after the last site
 *    build still reaches visitors.
 */

export const REPO = "allr-ajmx/allr-agent";
export const RELEASES_URL = `https://github.com/${REPO}/releases`;
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;

/** Named to match `ui/PlatformIcon`, which also knows about `"mobile"`. */
export type Platform = "macos" | "windows" | "linux";

export const PLATFORM_LABELS: Record<Platform, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

/** Desktop platforms in the order the site presents them. */
export const PLATFORM_ORDER: Platform[] = ["macos", "windows", "linux"];

export type ReleaseAsset = {
  name: string;
  url: string;
  size: number;
};

export type Release = {
  /** Raw git tag, e.g. `desktop-v0.0.7`. */
  tag: string;
  /** Display version with the tag prefix stripped, e.g. `0.0.7`. */
  version: string;
  publishedAt: string | null;
  assets: ReleaseAsset[];
};

type Candidate = {
  id: string;
  label: string;
  /** Shown under the label — who this build is for. */
  hint: string;
  match: RegExp;
};

/**
 * Per-platform download candidates, in preference order.
 *
 * Only candidates that actually match an asset on the live release are
 * rendered, which is what keeps the page correct across packaging changes: when
 * Linux drops the AppImage in favour of a tarball, `.AppImage` simply stops
 * matching and `.tar.gz` starts — no change needed here or in the components.
 *
 * These target the `Allr_*` full bundles, not the `Allr-Setup_*` bootstrap
 * installers. Signature (`.sig`) and checksum files can never match.
 */
const CANDIDATES: Record<Platform, Candidate[]> = {
  macos: [
    {
      id: "dmg",
      label: ".dmg",
      hint: "Apple silicon and Intel",
      match: /^Allr_[\d.]+_universal\.dmg$/,
    },
    {
      id: "app",
      label: ".app.tar.gz",
      hint: "App bundle",
      match: /^Allr_[\d.]+_universal\.app\.tar\.gz$/,
    },
  ],
  windows: [
    {
      id: "exe",
      label: ".exe",
      hint: "Installer",
      match: /^Allr_[\d.]+_x64-setup\.exe$/,
    },
    {
      id: "msi",
      label: ".msi",
      hint: "MSI package",
      match: /^Allr_[\d.]+_x64_en-US\.msi$/,
    },
  ],
  linux: [
    {
      id: "deb",
      label: ".deb",
      hint: "Debian and Ubuntu",
      match: /^Allr_[\d.]+_amd64\.deb$/,
    },
    {
      id: "rpm",
      label: ".rpm",
      hint: "Fedora, RHEL and openSUSE",
      match: /^Allr-[\d.]+-\d+\.x86_64\.rpm$/,
    },
    {
      id: "tar",
      label: ".tar.gz",
      hint: "Portable",
      match: /^Allr_[\d.]+_(?:linux[-_])?(?:amd64|x86_64)\.tar\.gz$/,
    },
    {
      id: "appimage",
      label: ".AppImage",
      hint: "Portable",
      match: /^Allr_[\d.]+_amd64\.AppImage$/,
    },
  ],
};

export type ResolvedDownload = {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** Bytes, or 0 when the size is unknown (the releases-page fallback). */
  size: number;
};

/** Human file size, e.g. `19.6 MB`. */
export function formatSize(bytes: number): string {
  const mb = bytes / 1_000_000;
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

/** `24 August 2026`, or null when the release carries no date. */
export function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Downloads to offer for `platform`, in preference order. Candidates with no
 * matching asset are dropped; with no release at all every platform falls back
 * to the releases page so the buttons are never dead.
 */
export function resolveDownloads(
  release: Release | null,
  platform: Platform,
): ResolvedDownload[] {
  if (!release) {
    return [
      {
        id: "releases",
        label: PLATFORM_LABELS[platform],
        hint: "All builds",
        href: RELEASES_URL,
        size: 0,
      },
    ];
  }

  return CANDIDATES[platform].flatMap((candidate) => {
    const asset = release.assets.find((a) => candidate.match.test(a.name));
    if (!asset) return [];
    return [
      {
        id: candidate.id,
        label: candidate.label,
        hint: candidate.hint,
        href: asset.url,
        size: asset.size,
      },
    ];
  });
}

/**
 * Drop assets no candidate can match before the release crosses into a client
 * component. Otherwise the whole listing — signatures, checksums, the bootstrap
 * installers — is serialized into the page for nothing.
 */
export function slimRelease(release: Release | null): Release | null {
  if (!release) return null;
  const wanted = Object.values(CANDIDATES).flat();
  return {
    ...release,
    assets: release.assets.filter((asset) =>
      wanted.some((candidate) => candidate.match.test(asset.name)),
    ),
  };
}

/**
 * The visitor's own platform, or undefined when we cannot tell.
 *
 * Undefined is deliberate: a wrong "Your platform" badge is worse than none.
 * Callers read this through `useSyncExternalStore` with an undefined server
 * snapshot, so the prerendered markup and the first client render match.
 */
export function detectPlatform(): Platform | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const raw = (
    nav.userAgentData?.platform ||
    nav.platform ||
    nav.userAgent ||
    ""
  ).toLowerCase();
  // Phones first: an Android UA also contains "linux".
  if (/android|iphone|ipad|ipod/.test(raw)) return undefined;
  if (raw.includes("win")) return "windows";
  if (raw.includes("mac") || raw.includes("darwin")) return "macos";
  if (raw.includes("linux") || raw.includes("x11")) return "linux";
  return undefined;
}

type GitHubRelease = {
  tag_name?: unknown;
  published_at?: unknown;
  assets?: unknown;
};

/** Narrow the GitHub payload without trusting its shape. */
function parseRelease(data: unknown): Release | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as GitHubRelease;
  if (typeof raw.tag_name !== "string") return null;

  const assets = Array.isArray(raw.assets)
    ? raw.assets.flatMap((entry): ReleaseAsset[] => {
        if (!entry || typeof entry !== "object") return [];
        const a = entry as Record<string, unknown>;
        if (
          typeof a.name !== "string" ||
          typeof a.browser_download_url !== "string"
        ) {
          return [];
        }
        return [
          {
            name: a.name,
            url: a.browser_download_url,
            size: typeof a.size === "number" ? a.size : 0,
          },
        ];
      })
    : [];

  return {
    tag: raw.tag_name,
    version: raw.tag_name.replace(/^desktop-v/, "").replace(/^v/, ""),
    publishedAt: typeof raw.published_at === "string" ? raw.published_at : null,
    assets,
  };
}

/**
 * Fetch the latest non-prerelease. Never throws: a rate limit, an outage or a
 * repo with no release yet must not fail the build or break the page — callers
 * fall back to the releases page.
 */
export async function fetchLatestRelease(): Promise<Release | null> {
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    return parseRelease(await res.json());
  } catch {
    return null;
  }
}
