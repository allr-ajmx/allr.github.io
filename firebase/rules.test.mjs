/**
 * Tests for firestore.rules.
 *
 * These rules no longer carry the whole security story — accounts are written
 * by the server through the Admin SDK, which bypasses rules entirely — but they
 * carry the half that faces the browser, and that half is now mostly about
 * refusal. A rule that wrongly allows a write here is an account somebody made
 * without asking us.
 *
 * Run with `pnpm test:rules`, which starts an emulator of its own.
 */

import { after, before, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

const RULES = path.resolve(import.meta.dirname, "firestore.rules");

/**
 * These tests destroy data: they empty the emulator so that fixed document ids
 * can be rewritten on every run. That is safe against an emulator started *for*
 * the tests and catastrophic against one somebody is using — it deletes their
 * account, and their next sign-in mints a new uid with no profile behind it.
 *
 * So the clearing only happens when `pnpm test:rules` says so.
 */
function requireThrowawayEmulator() {
  if (process.env.ALLR_TEST_EMULATOR === "1") return;
  throw new Error(
    "Refusing to run: these tests erase the emulator.\n" +
      "  Use `pnpm test:rules`, which starts an emulator of its own.\n" +
      "  (It sets ALLR_TEST_EMULATOR=1; nothing else should.)",
  );
}

let env;

const yearsAgo = (years) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return Timestamp.fromDate(d);
};

/** A profile as the server writes it. Used only to seed, never through rules. */
const profile = (uid, email, overrides = {}) => ({
  uid,
  email,
  name: "Ada Lovelace",
  dateOfBirth: yearsAgo(30),
  country: "GB",
  accountType: "individual",
  entityName: "",
  marketingOptIn: false,
  mobilePlatforms: ["ios"],
  termsVersion: "0.1-draft",
  privacyVersion: "0.1-draft",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  workspace_username: null,
  workspace_email: null,
  workspace_address: null,
  trial: null,
  ...overrides,
});

const asUser = (uid, email) =>
  env.authenticatedContext(uid, { email, email_verified: true }).firestore();

before(async () => {
  requireThrowawayEmulator();
  env = await initializeTestEnvironment({
    projectId: "demo-allr",
    firestore: { rules: readFileSync(RULES, "utf8") },
  });
  await env.clearFirestore();

  // Seeded with rules off, the way the server would write it.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/ada"), profile("ada", "ada@example.com"));
    await setDoc(doc(db, "users/ada/urls/one"), {
      url: "https://ada.allr.app",
      title: "Ada's site",
      kind: "site",
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, "user_emails/abc123"), { uid: "ada", email: "ada@example.com" });
    await setDoc(doc(db, "app_configuration/app"), { currentVersion: "1.0.0" });
  });
});

after(async () => {
  await env?.cleanup();
});

describe("users/{uid} — the browser may read its own and nothing else", () => {
  it("lets you read your own profile", async () => {
    await assertSucceeds(getDoc(doc(asUser("ada", "ada@example.com"), "users/ada")));
  });

  it("refuses somebody else's", async () => {
    await assertFails(getDoc(doc(asUser("bob", "bob@example.com"), "users/ada")));
  });

  it("refuses an anonymous read", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/ada")));
  });

  it("never lets the collection be listed", async () => {
    await assertFails(getDocs(collection(asUser("ada", "ada@example.com"), "users")));
  });
});

describe("users/{uid} — the browser may never write a profile", () => {
  it("refuses to let you create your own account directly", async () => {
    // The whole point: there is no signup except POST /api/account/register.
    const db = asUser("carol", "carol@example.com");
    await assertFails(
      setDoc(doc(db, "users/carol"), profile("carol", "carol@example.com")),
    );
  });

  it("refuses to let you edit your own profile directly", async () => {
    const db = asUser("ada", "ada@example.com");
    await assertFails(updateDoc(doc(db, "users/ada"), { name: "Someone Else" }));
  });

  it("refuses to let you grant yourself a workspace", async () => {
    const db = asUser("ada", "ada@example.com");
    await assertFails(
      updateDoc(doc(db, "users/ada"), {
        workspace_username: "ada",
        workspace_email: "ada@allr.work",
        workspace_address: "https://ada.allr.work",
      }),
    );
  });

  it("refuses to let you give yourself credit", async () => {
    const db = asUser("ada", "ada@example.com");
    await assertFails(
      updateDoc(doc(db, "users/ada"), {
        trial: { creditUsd: 5000, creditUsedUsd: 0 },
      }),
    );
  });

  it("refuses deletion", async () => {
    await assertFails(deleteDoc(doc(asUser("ada", "ada@example.com"), "users/ada")));
  });

  it("refuses a write to somebody else's profile", async () => {
    await assertFails(
      updateDoc(doc(asUser("bob", "bob@example.com"), "users/ada"), { name: "Bob" }),
    );
  });
});

describe("users/{uid}/urls — your published work", () => {
  it("lets you read your own", async () => {
    await assertSucceeds(
      getDocs(collection(asUser("ada", "ada@example.com"), "users/ada/urls")),
    );
  });

  it("refuses somebody else's", async () => {
    await assertFails(
      getDocs(collection(asUser("bob", "bob@example.com"), "users/ada/urls")),
    );
  });

  it("refuses a write, even your own", async () => {
    await assertFails(
      setDoc(doc(asUser("ada", "ada@example.com"), "users/ada/urls/two"), {
        url: "https://example.com",
      }),
    );
  });
});

describe("user_emails — the claim index is server-only", () => {
  it("refuses a read, so it cannot be used to test whether an address is taken", async () => {
    await assertFails(
      getDoc(doc(asUser("ada", "ada@example.com"), "user_emails/abc123")),
    );
  });

  it("refuses a write, so a claim cannot be forged or released", async () => {
    await assertFails(
      setDoc(doc(asUser("bob", "bob@example.com"), "user_emails/deadbeef"), {
        uid: "bob",
      }),
    );
  });
});

describe("app_configuration — public to read, admin to write", () => {
  it("lets anyone read the current version", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "app_configuration/app")));
  });

  it("refuses a write from a signed-in user", async () => {
    await assertFails(
      setDoc(doc(asUser("ada", "ada@example.com"), "app_configuration/app"), {
        currentVersion: "9.9.9",
      }),
    );
  });
});

/**
 * The account rules were added beside the waitlist rules. These make sure they
 * were added *beside* them and not on top of them.
 */
describe("the waitlist still behaves as it did", () => {
  const signup = () => ({
    email: "someone@example.com",
    source: "http://localhost:3000",
    userAgent: "node",
    createdAt: Timestamp.now(),
  });

  it("still lets an anonymous visitor join the early-access list", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "waitlist/abc123"), signup()));
  });

  it("still lets an anonymous visitor join the mobile beta", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(doc(db, "beta_signups/abc123"), { ...signup(), platform: "ios" }),
    );
  });

  it("still refuses to let anyone read the list", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, "waitlist")));
  });
});

describe("everything else is denied", () => {
  it("refuses a collection that has no rule block", async () => {
    await assertFails(
      setDoc(doc(asUser("ada", "ada@example.com"), "secrets/anything"), { a: 1 }),
    );
  });
});
