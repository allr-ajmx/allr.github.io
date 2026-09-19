import "server-only";

import { adminDb } from "./admin";
import { fetchLatestRelease, resolveDownloads } from "@/lib/releases";
import type { AppConfig, AppVersion } from "@/lib/account/app-config";

/**
 * Read the current app version.
 *
 * `app_configuration` is the source of truth, and GitHub Releases is the
 * fallback — not because both are equal, but because a /download page that is
 * blank until somebody remembers to seed a Firestore collection is worse than
 * one that quietly keeps working. The `source` field says which happened, so
 * the difference is visible rather than guessed at.
 */
export async function readAppConfig(): Promise<AppConfig> {
  try {
    const db = adminDb();
    const root = await db.collection("app_configuration").doc("app").get();
    const currentVersion = root.exists
      ? (root.data()?.currentVersion as string | undefined)
      : undefined;

    if (currentVersion) {
      const doc = await db
        .collection("app_configuration")
        .doc("app")
        .collection("versions")
        .doc(currentVersion)
        .get();

      if (doc.exists) {
        const data = doc.data()!;
        const current: AppVersion = {
          version: data.version ?? currentVersion,
          publishedAt: data.publishedAt?.toDate?.().toISOString() ?? null,
          notes: data.notes ?? null,
          downloads: data.downloads ?? {},
        };
        return { current, source: "app_configuration" };
      }
    }
  } catch {
    // An unconfigured Admin SDK, or an outage. Fall through to GitHub.
  }

  const release = await fetchLatestRelease();
  if (!release) return { current: null, source: "none" };

  const downloads: AppVersion["downloads"] = {};
  for (const platform of ["macos", "windows", "linux"] as const) {
    const first = resolveDownloads(release, platform)[0];
    if (first) downloads[platform] = first.href;
  }

  return {
    current: {
      version: release.version,
      publishedAt: release.publishedAt ?? null,
      notes: null,
      downloads,
    },
    // Say so: rollback is not available on this path.
    source: "github",
  };
}
