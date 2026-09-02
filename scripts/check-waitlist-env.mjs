/**
 * The waitlist has no server: `src/lib/waitlist.ts` writes from the browser,
 * using values baked in at build time. A build that ships without them serves
 * a form that cannot save anything — so refuse the build rather than find out
 * from someone who thought they had signed up.
 *
 * Locally that would only be in the way, so it warns instead.
 */

const FIREBASE = ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_API_KEY"];
const FALLBACKS = ["NEXT_PUBLIC_WAITLIST_URL", "NEXT_PUBLIC_WAITLIST_EMAIL"];

const has = (name) => Boolean(process.env[name]?.trim());
const configured = FIREBASE.every(has) || FALLBACKS.some(has);

if (configured) process.exit(0);

// Vercel sets CI too, but name both so the intent survives a host change.
const deploying = has("CI") || has("VERCEL");

const lines = [
  "Waitlist backend is not configured.",
  `  Set ${FIREBASE.join(" and ")} (see .env.example and firebase/README.md),`,
  `  or one of ${FALLBACKS.join(" / ")}.`,
];

if (deploying) {
  console.error(`\n✗ ${lines.join("\n")}\n`);
  console.error("  Refusing to build: signups would be silently dropped.\n");
  process.exit(1);
}

console.warn(`\n! ${lines.join("\n")}`);
console.warn("  Local build — signups will stay in localStorage.\n");
