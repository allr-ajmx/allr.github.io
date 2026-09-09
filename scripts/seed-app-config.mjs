/**
 * Put a version into `app_configuration` so the managed download path can be
 * seen working — and so a first deploy has something to serve before anyone
 * publishes a release by hand.
 *
 * Reads the current GitHub release and writes it as version 1. After that,
 * rolling back is editing `app_configuration/app.currentVersion` to name an
 * older version document; nothing here needs running again.
 *
 *   pnpm seed:app-config          # against whatever FIRESTORE_EMULATOR_HOST says
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8571 pnpm seed:app-config
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const PROJECT =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  (EMULATOR ? "demo-allr" : "");

if (!PROJECT) {
  console.error("\n✗ Set FIREBASE_PROJECT_ID (or run against the emulator).\n");
  process.exit(1);
}

if (!getApps().length) {
  if (EMULATOR) {
    initializeApp({ projectId: PROJECT });
    console.log(`Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}, project ${PROJECT}`);
  } else {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      console.error("\n✗ FIREBASE_SERVICE_ACCOUNT is not set.\n");
      process.exit(1);
    }
    const key = JSON.parse(raw);
    initializeApp({
      credential: cert({
        projectId: key.project_id,
        clientEmail: key.client_email,
        privateKey: key.private_key?.replace(/\\n/g, "\n"),
      }),
    });
    console.log(`Writing to the live project ${key.project_id}`);
  }
}

const REPO = "allr-ajmx/allr-agent";

/** The same asset shapes src/lib/releases.ts looks for. */
const MATCH = {
  macos: /Allr_.*\.dmg$/i,
  windows: /Allr_.*\.(exe|msi)$/i,
  linux: /Allr_.*\.(AppImage|deb)$/i,
};

const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
  headers: { Accept: "application/vnd.github+json" },
});

if (!res.ok) {
  console.error(`\n✗ Could not read the latest release (HTTP ${res.status}).\n`);
  process.exit(1);
}

const release = await res.json();
// Tags here look like `desktop-v0.0.8`, not `v0.0.8`, so strip any leading
// channel prefix as well as the v. The document id keeps the raw tag, which is
// what you type to roll back; `version` is what people read.
const tag = String(release.tag_name ?? "");
const version = tag.replace(/^.*?v(?=\d)/, "") || tag || "0.0.0";

const downloads = {};
for (const [platform, pattern] of Object.entries(MATCH)) {
  const asset = (release.assets ?? []).find((a) => pattern.test(a.name));
  if (asset) downloads[platform] = asset.browser_download_url;
}

if (Object.keys(downloads).length === 0) {
  console.warn("! No matching desktop assets found; writing the version anyway.");
}

const db = getFirestore();
const root = db.collection("app_configuration").doc("app");

await root.collection("versions").doc(tag).set({
  version,
  publishedAt: release.published_at
    ? Timestamp.fromDate(new Date(release.published_at))
    : Timestamp.now(),
  notes: release.name ?? null,
  downloads,
});

await root.set({ currentVersion: tag, updatedAt: Timestamp.now() });

console.log(`\n✓ app_configuration/app.currentVersion = ${tag}  (shown as ${version})`);
for (const [k, v] of Object.entries(downloads)) console.log(`    ${k.padEnd(8)} ${v}`);
console.log(
  "\n  Roll back by setting currentVersion to another version document.\n",
);
process.exit(0);
