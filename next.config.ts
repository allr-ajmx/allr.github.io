import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; an unrelated lockfile in a parent directory would
  // otherwise be picked up and produce a warning on every build.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
