import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * GitHub project Pages lives at /allr.github.io/ under the org site.
 * Leave BASE_PATH empty for local `next dev` / plain deploys.
 */
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

/**
 * Emulator ports, read from firebase.json so there is one place to change them.
 *
 * The browser has to know where the Auth and Firestore emulators are listening,
 * and firebase.json is what actually decides that. Duplicating the numbers into
 * the client meant two files had to agree, and the day they stopped agreeing
 * the failure would be a silent connection to nothing. The defaults here are
 * only for a firebase.json with no emulators block at all.
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

const nextConfig: NextConfig = {
  // Static HTML for GitHub Pages (no Node server).
  output: "export",
  // next/image needs this off for static hosting.
  images: { unoptimized: true },
  // Trailing slashes play nicer with GH Pages directory routing.
  trailingSlash: true,
  // So client code (Logo, hero engraving) can prefix public asset URLs.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    // Only read when NEXT_PUBLIC_FIREBASE_EMULATOR=1; inert in a real build.
    NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT: emulatorPort("auth", 9099),
    NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT: emulatorPort("firestore", 8571),
  },
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
  // Pin the workspace root; an unrelated lockfile in a parent directory would
  // otherwise be picked up and produce a warning on every build.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
