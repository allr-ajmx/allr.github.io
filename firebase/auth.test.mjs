/**
 * The sign-in path, end to end, against the emulators.
 *
 * `rules.test.mjs` checks the rules with synthetic auth tokens it mints itself.
 * That proves the rules are right; it does not prove that a *real* Google
 * sign-in produces a token those rules accept. This does — it goes through the
 * ordinary Firebase SDK, the same one the browser runs, with no test harness in
 * between and with the rules the emulator loaded from firestore.rules.
 *
 * The one that matters most is `email_verified`. The create rule refuses a
 * profile unless the token says the address is verified, so if Google's
 * provider ever came back without that claim, registration would fail at the
 * last step for everybody — and it would fail in production, not here.
 *
 * Run with `pnpm test:rules` (which starts Auth and Firestore around it).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { deleteApp, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import {
  Timestamp,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const PROJECT_ID = "demo-allr";
// From firebase.json, so a port change in one place cannot strand the tests.
const EMULATORS = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "..", "firebase.json"), "utf8"),
).emulators;
const FIRESTORE = `127.0.0.1:${EMULATORS.firestore.port}`;
const AUTH = `127.0.0.1:${EMULATORS.auth.port}`;
const RULES = path.resolve(import.meta.dirname, "firestore.rules");

/**
 * Load firestore.rules into the running emulator.
 *
 * This suite does it for itself rather than relying on the rules the emulator
 * booted with, because `rules.test.mjs` installs and tears down its own copy
 * through @firebase/rules-unit-testing. Whichever order the two run in, this
 * one starts from the file on disk.
 */
async function installRules() {
  const res = await fetch(
    `http://${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}:securityRules`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: { files: [{ name: "firestore.rules", content: readFileSync(RULES, "utf8") }] },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Could not load rules into the emulator: ${res.status}`);
  }
}

/**
 * A Google sign-in the emulator will accept.
 *
 * The Auth emulator takes a JSON string where a real Google ID token would go,
 * which is how you exercise the provider without talking to Google.
 */
const googleCredential = (claims) =>
  GoogleAuthProvider.credential(JSON.stringify(claims));

/**
 * Empty both emulators before the run.
 *
 * Registration is a create, and the rules refuse a create over a document that
 * already exists — so a suite that registers "ada@example.com" passes once and
 * fails every time after, unless it starts from nothing.
 */
/**
 * These tests destroy data: they empty the emulator so that fixed document ids
 * can be rewritten on every run. That is safe against an emulator started *for*
 * the tests and catastrophic against one somebody is using — it deletes their
 * account, and their next sign-in mints a new uid with no profile behind it.
 *
 * So the clearing only happens when `pnpm test:rules` says so. Running
 * `node --test firebase/*.test.mjs` by hand against a live emulator now stops
 * here instead of quietly wiping it.
 */
function requireThrowawayEmulator() {
  if (process.env.ALLR_TEST_EMULATOR === "1") return;
  throw new Error(
    "Refusing to run: these tests erase the emulator.\n" +
      "  Use `pnpm test:rules`, which starts an emulator of its own.\n" +
      "  (It sets ALLR_TEST_EMULATOR=1; nothing else should.)",
  );
}

async function clearEmulators() {
  await fetch(
    `http://${FIRESTORE}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: "DELETE",
  });
}

const yearsAgo = (years) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return Timestamp.fromDate(d);
};

const profileFor = (user, overrides = {}) => ({
  uid: user.uid,
  email: user.email.toLowerCase(),
  legalName: "Ada Lovelace",
  dateOfBirth: yearsAgo(30),
  country: "IN",
  accountType: "individual",
  entityName: "",
  marketingOptIn: false,
  termsVersion: "1.0",
  privacyVersion: "1.0",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

let app;
let auth;
let db;

before(async () => {
  requireThrowawayEmulator();
  await installRules();
  await clearEmulators();
  app = initializeApp(
    { apiKey: "demo-key", projectId: PROJECT_ID, authDomain: `${PROJECT_ID}.firebaseapp.com` },
    "auth-e2e",
  );
  auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH}`, { disableWarnings: true });
  db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", EMULATORS.firestore.port);
});

after(async () => {
  await signOut(auth).catch(() => {});
  await deleteApp(app);
});

describe("signing in with Google", () => {
  it("returns a token whose email is marked verified", async () => {
    const { user } = await signInWithCredential(
      auth,
      googleCredential({
        sub: "google-ada",
        email: "ada@example.com",
        email_verified: true,
        name: "Ada Lovelace",
      }),
    );

    const token = await user.getIdTokenResult();
    // The create rule hangs on this claim. If it is ever missing or false,
    // every registration fails on its last step.
    assert.equal(
      token.claims.email_verified,
      true,
      "Google sign-in must produce email_verified — firestore.rules requires it",
    );
    assert.equal(user.email, "ada@example.com");
    assert.equal(user.emailVerified, true);
  });

  it("cannot create its own profile — there is no signup but the API", async () => {
    const user = auth.currentUser;
    assert.ok(user, "expected to still be signed in");

    // A correctly signed-in person, with a perfectly valid profile, is still
    // refused. Registration exists at POST /api/account/register and nowhere
    // else, which is what stops a second account for one address.
    await assert.rejects(
      setDoc(doc(db, "users", user.uid), profileFor(user)),
      (err) => err.code === "permission-denied",
      "the browser must have no path to writing a profile",
    );
  });

  it("cannot grant itself a workspace or credit", async () => {
    const user = auth.currentUser;
    await assert.rejects(
      setDoc(doc(db, "users", user.uid), {
        workspace_username: "ada",
        workspace_email: "ada@allr.work",
        workspace_address: "https://ada.allr.work",
      }),
      (err) => err.code === "permission-denied",
    );
  });

  it("refuses to read somebody else's profile after switching accounts", async () => {
    const { user } = await signInWithCredential(
      auth,
      googleCredential({
        sub: "google-mallory",
        email: "mallory@example.com",
        email_verified: true,
        name: "Mallory",
      }),
    );
    assert.notEqual(user.email, "ada@example.com");

    await assert.rejects(
      getDoc(doc(db, "users", "google-ada")),
      (err) => err.code === "permission-denied",
    );
  });

  it("stops seeing anything once signed out", async () => {
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    await assert.rejects(
      getDoc(doc(db, "users", "google-ada")),
      (err) => err.code === "permission-denied",
    );
  });
});
