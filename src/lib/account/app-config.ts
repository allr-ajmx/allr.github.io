/**
 * What version of the app is current, and where to get it.
 *
 * This replaces "the latest GitHub release is the download" (DESIGN.md §16).
 * The GitHub Releases API only ever knows what is *latest*, so a bad build can
 * only be fixed by cutting another one. Here the current version is a pointer,
 * and rolling back is editing it to name an older version document.
 *
 * Shared between client and server, so it imports nothing that only runs in one.
 */

export type DesktopPlatform = "macos" | "windows" | "linux";
export type AppPlatform = DesktopPlatform | "ios" | "android";

export type AppVersion = {
  version: string;
  /** ISO 8601, or null when we only know the version. */
  publishedAt: string | null;
  notes: string | null;
  /** Missing platforms simply have no build yet. */
  downloads: Partial<Record<AppPlatform, string>>;
};

export type AppConfig = {
  current: AppVersion | null;
  /**
   * Where this came from. `github` means `app_configuration` was empty or
   * unreachable and we fell back — the page still works, but rollback does not.
   */
  source: "app_configuration" | "github" | "none";
};

export const DESKTOP_LABELS: Record<DesktopPlatform, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};
