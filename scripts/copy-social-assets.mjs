/**
 * After `next build` (static export), ensure GitHub Pages serves `_next/`.
 * OG/icon PNGs live in /public and are copied into `out/` by Next automatically.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

writeFileSync(join(process.cwd(), "out", ".nojekyll"), "");
console.log("[copy-social-assets] wrote out/.nojekyll");
