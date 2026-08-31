/**
 * Copy a built docs site into `public/docs`, so allr.work/docs is served by
 * this deployment instead of proxied to another host.
 *
 * The docs are written and built in the product repo (`allr-agent/website`,
 * Docusaurus, `baseUrl: '/docs/'`). Nothing here edits them — this only lifts a
 * finished build across, which is why `public/docs` is generated output that
 * happens to be committed: Vercel builds this repo alone and has no way to
 * reach the other one.
 *
 * Usage:
 *   node scripts/sync-docs.mjs [--from <dir>]
 *
 * `<dir>` is either a Docusaurus `build/` directory or the `_site` staging
 * directory the docs workflow uploads (a `docs/` folder plus `llms*.txt` at its
 * root). Both are recognised; the default is the sibling checkout.
 *
 * Re-run it whenever the docs change and commit the result — a docs edit is
 * live here only after a fresh sync.
 */
import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const fromFlag = args.indexOf("--from");
const source = resolve(
  fromFlag === -1 ? "../allr-agent/website/build" : args[fromFlag + 1],
);

if (!existsSync(source)) {
  console.error(`[sync-docs] no such directory: ${source}`);
  process.exit(1);
}

// `_site` staging (docs/ + llms*.txt) or a plain Docusaurus build.
const staged = existsSync(join(source, "docs", "index.html"));
const docsRoot = staged ? join(source, "docs") : source;
const llmsRoot = staged ? source : join(source, "");

if (!existsSync(join(docsRoot, "index.html"))) {
  console.error(`[sync-docs] ${docsRoot} does not look like a built docs site`);
  process.exit(1);
}

const publicDir = resolve("public");
const target = join(publicDir, "docs");

// Replace rather than merge: a stale page from an older build would otherwise
// outlive the rename that removed it, and Docusaurus' own redirects are the
// only thing that should keep an old URL alive.
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(docsRoot, target, { recursive: true });

// Agents and IDE plugins probe the classic root-level path, so these live at
// both /llms.txt and /docs/llms.txt — same file, one source.
for (const name of ["llms.txt", "llms-full.txt"]) {
  const candidate = join(llmsRoot, name);
  const nested = join(docsRoot, name);
  const src = existsSync(candidate) ? candidate : existsSync(nested) ? nested : null;
  if (src) cpSync(src, join(publicDir, name));
}

let files = 0;
let bytes = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else {
      files += 1;
      bytes += statSync(path).size;
    }
  }
};
walk(target);

console.log(
  `[sync-docs] ${files} files (${(bytes / 1e6).toFixed(0)} MB) from ${source} -> public/docs`,
);
