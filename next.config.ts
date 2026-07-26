import path from "node:path";
import type { NextConfig } from "next";

/**
 * GitHub project Pages lives at /allr.github.io/ under the org site.
 * Leave BASE_PATH empty for local `next dev` / plain deploys.
 */
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

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
