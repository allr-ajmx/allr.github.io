/**
 * The admin Customers list reads one page (or one search) of accounts, not
 * the whole users collection: its cost must not grow with the customer count.
 * Pagination never skips or repeats an account; search is starts-with on
 * email / workspace / name, or an exact uid; "needs attention" builds show
 * whatever page is loaded.
 */
import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import { resetDb, seedUser } from "./harness.ts";

const ADMIN = "ops@allr.test";
let token = "";

/**
 * A real ID token from the Auth emulator — a verified Google sign-in, the
 * only kind the session check accepts — so the admin gate runs for real.
 */
async function signIn(email: string) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const fakeGoogle = JSON.stringify({ sub: `g-${email}`, email, email_verified: true });
  const res = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      postBody: `providerId=google.com&id_token=${encodeURIComponent(fakeGoogle)}`,
      requestUri: "http://localhost",
      returnSecureToken: true,
    }),
  });
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error(`auth emulator sign-in failed: ${JSON.stringify(body)}`);
  return body.idToken;
}

type Page = {
  total: number; nextCursor: string | null; capped: boolean; query: string;
  customers: { uid: string; email: string; purchases: unknown[] }[];
  workspaceOnly: { username: string; matchUid: string | null }[];
  attentionQueues: { uid: string; email: string; status: string }[];
};

async function list(params: Record<string, string> = {}, bearer = token) {
  const { GET } = await import("@/app/api/admin-ui/customers/route");
  const qs = new URLSearchParams(params).toString();
  const res = await GET(new Request(`https://www.allr.work/api/admin-ui/customers/?${qs}`, {
    headers: { authorization: `Bearer ${bearer}` },
  }));
  return { status: res.status, body: (await res.json()) as Page };
}

/** n accounts, newest first: u0 is the most recent. */
async function seedMany(n: number) {
  const base = Date.now();
  for (let i = 0; i < n; i++) {
    await seedUser(`u${i}`, `user${String(i).padStart(2, "0")}@example.com`, {
      fields: { createdAt: new Date(base - i * 60_000), name: `Person ${i}` },
    });
  }
}

before(async () => {
  process.env.ALLR_ADMIN_UI_EMAILS = ADMIN;
  token = await signIn(ADMIN);
});
beforeEach(async () => {
  await resetDb();
});

describe("pagination", () => {
  it("pages through every account exactly once, newest first", async () => {
    await seedMany(30);
    const p1 = await list();
    assert.equal(p1.status, 200);
    assert.equal(p1.body.total, 30);
    assert.equal(p1.body.customers.length, 25);
    assert.equal(p1.body.customers[0].uid, "u0");
    assert.ok(p1.body.nextCursor);

    const p2 = await list({ after: p1.body.nextCursor! });
    assert.equal(p2.body.customers.length, 5);
    assert.equal(p2.body.nextCursor, null);
    const all = [...p1.body.customers, ...p2.body.customers].map((c) => c.uid);
    assert.equal(new Set(all).size, 30, "no account skipped or repeated");
  });

  it("loads purchases only for the accounts on the page", async () => {
    await seedMany(27);
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("credit_purchases/pay_new").set({ uid: "u0", creditUsd: 10, amountMinor: 1000, currency: "USD", createdAt: new Date() });
    await adminDb().doc("credit_purchases/pay_old").set({ uid: "u26", creditUsd: 25, amountMinor: 2500, currency: "USD", createdAt: new Date() });
    const p1 = await list();
    assert.equal(p1.body.customers.find((c) => c.uid === "u0")?.purchases.length, 1);
    assert.equal(p1.body.customers.some((c) => c.uid === "u26"), false);
    const p2 = await list({ after: p1.body.nextCursor! });
    assert.equal(p2.body.customers.find((c) => c.uid === "u26")?.purchases.length, 1);
  });

  it("is admin-only", async () => {
    const other = await signIn("someone@example.com");
    const res = await list({}, other);
    assert.equal(res.status, 403);
  });
});

describe("search", () => {
  beforeEach(async () => {
    await seedMany(3);
    await seedUser("kam", "kamal.r@example.com", { ws: "kamal", fields: { name: "Kamal Rao", createdAt: new Date() } });
    await seedUser("pri", "p.s@example.com", { fields: { name: "Priya S", createdAt: new Date(), pending_workspace_username: "priya" } });
  });

  const uidsFor = async (q: string) => (await list({ q })).body.customers.map((c) => c.uid).sort();

  it("matches the start of an email, workspace, pending workspace or name", async () => {
    assert.deepEqual(await uidsFor("kamal.r@"), ["kam"]);
    assert.deepEqual(await uidsFor("kam"), ["kam"]);
    assert.deepEqual(await uidsFor("priy"), ["pri"]);
    assert.deepEqual(await uidsFor("Kamal R"), ["kam"]);
  });

  it("is forgiving about case for emails and names", async () => {
    assert.deepEqual(await uidsFor("KAMAL"), ["kam"]);
    assert.deepEqual(await uidsFor("priya s"), ["pri"]);
  });

  it("finds an exact account id", async () => {
    assert.deepEqual(await uidsFor("u1"), ["u1"]);
  });

  it("a one-letter query is just the list; no match is an empty list", async () => {
    assert.equal((await list({ q: "k" })).body.customers.length, 5);
    assert.deepEqual(await uidsFor("zzz"), []);
  });
});

describe("what shows on every page", () => {
  it("a failed or retrying build is listed even when its account is not on this page", async () => {
    await seedMany(30);
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("provision_queue/u29").set({ uid: "u29", email: "user29@example.com", username: "late", status: "failed", error: "docker pull failed", attempts: 3 });
    await adminDb().doc("provision_queue/u28").set({ uid: "u28", email: "user28@example.com", username: "later", status: "queued", attempts: 1 });
    await adminDb().doc("provision_queue/u27").set({ uid: "u27", email: "user27@example.com", username: "fresh", status: "queued", attempts: 0 });
    const p1 = await list();
    assert.equal(p1.body.customers.some((c) => c.uid === "u29"), false);
    assert.deepEqual(p1.body.attentionQueues.map((x) => x.uid).sort(), ["u28", "u29"]);
  });

  it("manual-era workspaces show on the first page with a link offer, never on later pages", async () => {
    await seedMany(26);
    await seedUser("owner", "owner@example.com", { ws: "claimed", fields: { createdAt: new Date(0) } });
    const { adminDb } = await import("@/lib/server/admin");
    await adminDb().doc("workspace_roster/claimed").set({ username: "claimed", email: "owner@example.com", gone: false, updatedAt: new Date() });
    await adminDb().doc("workspace_roster/manual").set({ username: "manual", email: "user05@example.com", gone: false, updatedAt: new Date() });
    await adminDb().doc("workspace_roster/old").set({ username: "old", email: "x@example.com", gone: true, updatedAt: new Date() });
    const p1 = await list();
    assert.deepEqual(p1.body.workspaceOnly.map((w) => [w.username, w.matchUid]), [["manual", "u5"]]);
    const p2 = await list({ after: p1.body.nextCursor! });
    assert.deepEqual(p2.body.workspaceOnly, []);
    const s = await list({ q: "man" });
    assert.deepEqual(s.body.workspaceOnly.map((w) => w.username), ["manual"]);
  });
});
