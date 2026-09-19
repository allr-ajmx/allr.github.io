import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * Emulator ports, read from firebase.json so there is one place to change them.
 *
 * The browser has to know where the Auth and Firestore emulators are listening,
 * and firebase.json is what actually decides that. Duplicating the numbers into
 * the client meant two files had to agree, and the day they stopped agreeing
 * the failure would be a silent connection to nothing.
 *
 * These are not Firebase's own defaults: 8080 and 4000 are heavily contested on
 * a developer machine — a local reverse proxy or an LLM gateway will take them
 * long before this project asks.
 */
const emulators: Record<string, { port?: number }> = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "firebase.json"), "utf8"),
).emulators ?? {};

const emulatorPort = (name: string, fallback: number) =>
  String(emulators[name]?.port ?? fallback);

/**
 * The site runs on Vercel, with a server.
 *
 * It used to be `output: "export"` for GitHub Pages, and that shaped everything:
 * no API routes, no middleware, and Firestore rules as the only thing standing
 * between a browser and the database. Accounts broke that. One account per email
 * address cannot be enforced from the browser — the document id is the uid, so
 * two uids with the same address both write successfully — and the fields that
 * say whether someone is approved must not be writable by the person they
 * describe. Both need a server holding a service account (DESIGN.md §16).
 */
const nextConfig: NextConfig = {
  /**
   * Kept from the GitHub Pages days, but no longer for its original reason.
   * These are the site's canonical URLs — they are in the sitemap and in
   * whatever has already linked to them — and every internal href is written
   * with the slash. Dropping it would 308-redirect every one of them.
   */
  trailingSlash: true,
  env: {
    // Only read when NEXT_PUBLIC_FIREBASE_EMULATOR=1; inert in a real build.
    NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT: emulatorPort("auth", 9099),
    NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT: emulatorPort("firestore", 8571),
  },
  // Pin the workspace root; an unrelated lockfile in a parent directory would
  // otherwise be picked up and produce a warning on every build.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
