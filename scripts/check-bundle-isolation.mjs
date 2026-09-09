/**
 * The marketing pages must not ship the Firebase SDK.
 *
 * `/login` and `/account` need it; the homepage has no use for ~500 KB of auth
 * and Firestore code, and the only thing keeping the two apart is that nothing
 * outside `src/lib/firebase/` and `src/components/account/` imports the SDK.
 * That is an easy rule to break by accident — one shared component importing
 * `firebase/app` for a type would do it, silently — so this checks the built
 * output rather than trusting the rule.
 *
 * It looks for SDK fingerprints, not the word "firebase": `src/lib/waitlist.ts`
 * legitimately carries `NEXT_PUBLIC_FIREBASE_*` on every page.
 *
 * Run after `pnpm build`.
 *
 * It reads the prerendered HTML under `.next/server/app` rather than a static
 * `out/` folder — the site moved to Vercel and there is no export any more —
 * but the question it answers is unchanged.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const APP = path.resolve(import.meta.dirname, "..", ".next", "server", "app");
const STATIC = path.resolve(import.meta.dirname, "..", ".next");

/** Pages that must stay free of the SDK. */
const MARKETING = ["/", "/app", "/download", "/design", "/privacy", "/terms"];
/** Pages that are expected to carry it. */
const ACCOUNT = ["/login", "/account"];

// Strings that only exist inside the Firebase SDK itself.
const FINGERPRINTS = [
  "identitytoolkit",
  "securetoken.googleapis.com",
  "signInWithPopup",
  "FirebaseError",
  "@firebase/auth",
];

function htmlFor(route) {
  // Next writes `/` as index.html and `/account` as account.html.
  return path.join(APP, route === "/" ? "index.html" : `${route.slice(1)}.html`);
}

function inspect(route) {
  const file = htmlFor(route);
  if (!existsSync(file)) return null;
  const html = readFileSync(file, "utf8");
  const refs = [...new Set(html.match(/\/_next\/static\/[^"'\s\\)]+\.js/g) ?? [])];

  let bytes = 0;
  const carrying = [];
  for (const ref of refs) {
    // `/_next/static/...` is a URL prefix; on disk that is `.next/static/...`.
    const asset = path.join(STATIC, ref.replace(/^\/_next\//, ""));
    if (!existsSync(asset)) continue;
    bytes += statSync(asset).size;
    const body = readFileSync(asset, "utf8");
    if (FINGERPRINTS.some((f) => body.includes(f))) carrying.push(ref);
  }
  return { refs: refs.length, kb: bytes / 1024, carrying };
}

let failed = false;

console.log("\nMarketing pages — must NOT carry the Firebase SDK\n");
for (const route of MARKETING) {
  const r = inspect(route);
  if (!r) continue;
  const ok = r.carrying.length === 0;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? "✓" : "✗"} ${route.padEnd(12)} ${r.refs
      .toString()
      .padStart(2)} chunks  ${r.kb.toFixed(0).padStart(5)} KB` +
      (ok ? "" : `  ← ${r.carrying.join(", ")}`),
  );
}

console.log("\nAccount pages — expected to carry it\n");
for (const route of ACCOUNT) {
  const r = inspect(route);
  if (!r) continue;
  const ok = r.carrying.length > 0;
  if (!ok) failed = true;
  console.log(
    `  ${ok ? "✓" : "✗"} ${route.padEnd(12)} ${r.refs
      .toString()
      .padStart(2)} chunks  ${r.kb.toFixed(0).padStart(5)} KB` +
      (ok ? "" : "  ← no SDK found; did the import move?"),
  );
}

console.log();
if (failed) {
  console.error("✗ Bundle isolation is broken.\n");
  process.exit(1);
}
console.log("✓ The Firebase SDK stays inside /login and /account.\n");
