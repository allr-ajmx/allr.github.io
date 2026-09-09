/**
 * Tests for firestore.rules.
 *
 * The site is a static export. There is no server between a browser and this
 * database, so these rules are not a second line of defence — they are the
 * only one. That is why they get tests and the UI does not: a bug in the
 * registration form shows someone a confusing message, a bug in here hands out
 * somebody else's date of birth.
 *
 * Run with `pnpm test:rules`, which starts the Firestore emulator around them.
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
  serverTimestamp,
} from "firebase/firestore";

const RULES = path.resolve(import.meta.dirname, "firestore.rules");

let env;

/** A date `years` ago, as a Firestore Timestamp. */
const yearsAgo = (years) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return Timestamp.fromDate(d);
};

/** A complete, valid profile for `uid`. Override one field to test that field. */
const profile = (uid, email, overrides = {}) => ({
  uid,
  email,
  legalName: "Ada Lovelace",
  dateOfBirth: yearsAgo(30),
  country: "GB",
  accountType: "individual",
  entityName: "",
  marketingOptIn: false,
  termsVersion: "0.1-draft",
  privacyVersion: "0.1-draft",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

/** Signed in with Google: a uid and an email Google says it verified. */
const asUser = (uid, email, extra = {}) =>
  env
    .authenticatedContext(uid, { email, email_verified: true, ...extra })
    .firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-allr",
    firestore: { rules: readFileSync(RULES, "utf8") },
  });
  // These tests write to fixed document ids, and the waitlist rules refuse a
  // second write to an id that already exists — which is the whole point of
  // them. Without this the suite passes only against a freshly booted
  // emulator and fails against the one `pnpm emulate` leaves running.
  await env.clearFirestore();
});

after(async () => {
  await env?.cleanup();
});

describe("users/{uid} — creating a profile", () => {
  it("lets a signed-in person create their own", async () => {
    const db = asUser("alice", "alice@example.com");
    await assertSucceeds(
      setDoc(doc(db, "users/alice"), profile("alice", "alice@example.com")),
    );
  });

  it("refuses an anonymous visitor", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, "users/alice"), profile("alice", "alice@example.com")),
    );
  });

  it("refuses a document under somebody else's uid", async () => {
    const db = asUser("bob", "bob@example.com");
    await assertFails(
      setDoc(doc(db, "users/alice"), profile("alice", "bob@example.com")),
    );
  });

  it("refuses an email that is not the one on the token", async () => {
    const db = asUser("carol", "carol@example.com");
    await assertFails(
      setDoc(doc(db, "users/carol"), profile("carol", "someone.else@example.com")),
    );
  });

  it("refuses an unverified email", async () => {
    const db = env
      .authenticatedContext("dave", { email: "dave@example.com", email_verified: false })
      .firestore();
    await assertFails(
      setDoc(doc(db, "users/dave"), profile("dave", "dave@example.com")),
    );
  });

  it("refuses anyone under 18 — the age gate is not just the form", async () => {
    const db = asUser("erin", "erin@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/erin"),
        profile("erin", "erin@example.com", { dateOfBirth: yearsAgo(14) }),
      ),
    );
  });

  it("refuses a date of birth in the future", async () => {
    const db = asUser("frank", "frank@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/frank"),
        profile("frank", "frank@example.com", { dateOfBirth: yearsAgo(-5) }),
      ),
    );
  });

  it("refuses an extra field nobody asked for", async () => {
    const db = asUser("grace", "grace@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/grace"),
        profile("grace", "grace@example.com", { isAdmin: true }),
      ),
    );
  });

  it("refuses a business with no registered name", async () => {
    const db = asUser("heidi", "heidi@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/heidi"),
        profile("heidi", "heidi@example.com", {
          accountType: "business",
          entityName: "",
        }),
      ),
    );
  });

  it("refuses an individual carrying a leftover business name", async () => {
    const db = asUser("ivan", "ivan@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/ivan"),
        profile("ivan", "ivan@example.com", {
          accountType: "individual",
          entityName: "Old Company Ltd",
        }),
      ),
    );
  });

  it("refuses a profile that records no accepted terms", async () => {
    const db = asUser("kate", "kate@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/kate"),
        profile("kate", "kate@example.com", { termsVersion: "" }),
      ),
    );
  });

  it("refuses a profile that records no accepted privacy policy", async () => {
    const db = asUser("liam", "liam@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/liam"),
        profile("liam", "liam@example.com", { privacyVersion: "" }),
      ),
    );
  });

  it("refuses a country that is not a two-letter code", async () => {
    const db = asUser("judy", "judy@example.com");
    await assertFails(
      setDoc(
        doc(db, "users/judy"),
        profile("judy", "judy@example.com", { country: "United Kingdom" }),
      ),
    );
  });
});

describe("users/{uid} — reading", () => {
  before(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/mallory"), {
        ...profile("mallory", "mallory@example.com"),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  it("lets you read your own", async () => {
    const db = asUser("mallory", "mallory@example.com");
    await assertSucceeds(getDoc(doc(db, "users/mallory")));
  });

  it("refuses somebody else's", async () => {
    const db = asUser("trent", "trent@example.com");
    await assertFails(getDoc(doc(db, "users/mallory")));
  });

  it("refuses an anonymous read", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/mallory")));
  });

  it("never lets the collection be listed, even by a signed-in user", async () => {
    const db = asUser("mallory", "mallory@example.com");
    await assertFails(getDocs(collection(db, "users")));
  });
});

describe("users/{uid} — changing and deleting", () => {
  const EMAIL = "nina@example.com";

  before(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/nina"), {
        ...profile("nina", EMAIL),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  it("lets you correct your own name", async () => {
    const db = asUser("nina", EMAIL);
    await assertSucceeds(
      updateDoc(doc(db, "users/nina"), {
        legalName: "Nina Simone",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("lets you correct a mistyped date of birth to another adult date", async () => {
    const db = asUser("nina", EMAIL);
    await assertSucceeds(
      updateDoc(doc(db, "users/nina"), {
        dateOfBirth: yearsAgo(41),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses editing yourself into being a minor", async () => {
    const db = asUser("nina", EMAIL);
    await assertFails(
      updateDoc(doc(db, "users/nina"), {
        dateOfBirth: yearsAgo(12),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses changing the email away from the token's", async () => {
    const db = asUser("nina", EMAIL);
    await assertFails(
      updateDoc(doc(db, "users/nina"), {
        email: "someone.else@example.com",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses rewriting createdAt", async () => {
    const db = asUser("nina", EMAIL);
    await assertFails(
      updateDoc(doc(db, "users/nina"), {
        createdAt: Timestamp.fromDate(new Date("2020-01-01")),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses an edit to somebody else's profile", async () => {
    const db = asUser("oscar", "oscar@example.com");
    await assertFails(
      updateDoc(doc(db, "users/nina"), {
        legalName: "Not Nina",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("refuses deletion, even your own", async () => {
    const db = asUser("nina", EMAIL);
    await assertFails(deleteDoc(doc(db, "users/nina")));
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

  it("still refuses to let a signed-in user read the list", async () => {
    const db = asUser("alice", "alice@example.com");
    await assertFails(getDoc(doc(db, "waitlist/abc123")));
  });
});

describe("everything else is denied", () => {
  it("refuses a collection that has no rule block", async () => {
    const db = asUser("alice", "alice@example.com");
    await assertFails(setDoc(doc(db, "secrets/anything"), { a: 1 }));
  });
});
