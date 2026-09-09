/**
 * Firebase configuration, with no Firebase import in sight.
 *
 * This module is separate from `app.ts` on purpose. `src/lib/waitlist.ts` runs
 * on the homepage and talks to Firestore over plain REST; if it reached into
 * `app.ts` for these constants it would drag the whole 150 KB SDK into the
 * marketing bundle, which is the one thing the account work must not do.
 * Nothing here imports anything.
 */

export const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
export const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
export const FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

/**
 * True when the build is pointed at the local emulator suite (`pnpm dev:emulated`).
 *
 * An explicit flag, not a `hostname === "localhost"` sniff: "am I running
 * locally" and "am I meant to use the emulator" are different questions, and
 * guessing would make it impossible to test a local build against the real
 * project when that is exactly what you meant to do.
 */
export const USING_EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";

/**
 * Firestore's REST host. The waitlist writes here directly, so pointing it at
 * the emulator is what stops a local test signup landing in production.
 */
/**
 * Where the emulators listen.
 *
 * `next.config.ts` reads these out of firebase.json and inlines them, so the
 * ports are declared once. Changing a port in firebase.json is enough; nothing
 * here needs editing, and the two can never disagree.
 *
 * They are not Firebase's defaults. 8080 and 4000 are contested on a developer
 * machine — a local reverse proxy or an LLM gateway will have taken them.
 */
export const FIRESTORE_EMULATOR_HOST = "127.0.0.1";
export const FIRESTORE_EMULATOR_PORT = Number(
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_FIRESTORE_PORT || 8571,
);
const AUTH_EMULATOR_PORT = Number(
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_AUTH_PORT || 9099,
);

export const AUTH_EMULATOR_URL = `http://127.0.0.1:${AUTH_EMULATOR_PORT}`;

export const FIRESTORE_HOST = USING_EMULATOR
  ? `http://${FIRESTORE_EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`
  : "https://firestore.googleapis.com";

/**
 * Whether sign-in can work at all in this build. A build with no Firebase env
 * would otherwise show a login button that throws an opaque SDK error.
 */
export const AUTH_CONFIGURED = Boolean(FIREBASE_PROJECT_ID && FIREBASE_API_KEY);
