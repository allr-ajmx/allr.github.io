/**
 * Integration harness: the real server modules, against the Firestore and
 * Auth emulators (started by `pnpm test:integration`) and a fake Razorpay.
 * Each test starts from an empty database.
 */
import { FakeRazorpay } from "./fake-razorpay.ts";

process.env.FIREBASE_PROJECT_ID ??= "demo-allr";
process.env.ALLR_FIRESTORE_STRICT = "1";
process.env.RAZORPAY_KEY_ID ??= "rzp_test_harness";
process.env.RAZORPAY_KEY_SECRET ??= "harness-secret";
process.env.RAZORPAY_PLAN_ID_USD ??= "plan_usd";
process.env.RAZORPAY_PLAN_ID_INR ??= "plan_inr";
process.env.RAZORPAY_PLAN_ID_WORKSPACE_USD ??= "plan_ws_usd";
process.env.RAZORPAY_PLAN_ID_WORKSPACE_INR ??= "plan_ws_inr";
process.env.RAZORPAY_WEBHOOK_SECRET ??= "whsec_harness";
process.env.ALLR_ADMIN_API_TOKEN ??= "x".repeat(40);

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Run integration tests through `pnpm test:integration` (needs the Firestore emulator).");
}

export async function resetDb() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const project = process.env.FIREBASE_PROJECT_ID;
  const res = await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`, { method: "DELETE" });
  if (!res.ok) throw new Error(`could not reset the emulator: ${res.status}`);
}

export function freshRazorpay() {
  return new FakeRazorpay().install();
}

/** A signed-in caller, as requireUser would produce it. */
export const caller = (uid: string, email: string, name = "Test Person") =>
  ({ uid, email, name, token: {} }) as never;

/**
 * An account as registration + provisioning leave it. `ws` gives it a linked
 * workspace; anything else overrides fields directly (billing, credits, …).
 */
export async function seedUser(
  uid: string,
  email: string,
  opts: { ws?: string; country?: string; fields?: Record<string, unknown> } = {},
) {
  const { adminDb } = await import("@/lib/server/admin");
  const { createHash } = await import("node:crypto");
  const db = adminDb();
  const now = new Date();
  await db.collection("users").doc(uid).set({
    uid, email, name: "Test Person", confirmedOver18: true, country: opts.country ?? "IN",
    accountType: "individual", entityName: "", marketingOptIn: false, mobilePlatforms: [],
    earlyAccessRequestedAt: null, termsVersion: "1", privacyVersion: "1",
    createdAt: now, updatedAt: now,
    workspace_username: opts.ws ?? null,
    workspace_email: opts.ws ? email : null,
    workspace_address: opts.ws ? `https://${opts.ws}.allr.work` : null,
    trial: null, billing: null, pending_workspace_username: null, enforcement: null,
    ...(opts.fields ?? {}),
  });
  await db.collection("user_emails").doc(createHash("sha256").update(email).digest("hex")).set({ uid, email });
  return db.collection("users").doc(uid);
}

export async function read(path: string) {
  const { adminDb } = await import("@/lib/server/admin");
  return (await adminDb().doc(path).get()).data();
}

export async function list(collection: string) {
  const { adminDb } = await import("@/lib/server/admin");
  return (await adminDb().collection(collection).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
}

export const iso = (msFromNow = 0) => new Date(Date.now() + msFromNow).toISOString();
export const DAY = 86_400_000;

/** POST a Razorpay webhook to the real route, signed like Razorpay signs it. */
export async function webhook(event: string, entities: Record<string, unknown>, eventId?: string) {
  const { createHmac } = await import("node:crypto");
  const { POST } = await import("@/app/api/billing/webhook/route");
  const payload = Object.fromEntries(Object.entries(entities).map(([k, v]) => [k, { entity: v }]));
  const raw = JSON.stringify({ event, payload });
  const sig = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(raw).digest("hex");
  const res = await POST(new Request("https://www.allr.work/api/billing/webhook/", {
    method: "POST",
    headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": eventId ?? `evt_${Math.random().toString(36).slice(2)}` },
    body: raw,
  }));
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
}

/** Call a worker-facing route (bearer token) the way the VPS does. */
export async function worker(route: string, body: unknown = {}) {
  const mod = await import(`@/app/api/admin/${route}/route`);
  const res = await mod.POST(new Request(`https://www.allr.work/api/admin/${route}/`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.ALLR_ADMIN_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** An admin pulls a lever, through the same parser and applier the route uses. */
export async function admin(body: unknown, by = "ops@allr.test") {
  const { applyAdminAction, parseAction } = await import("@/lib/server/admin-actions");
  return applyAdminAction({ uid: "admin", email: by, name: "Ops", token: {} } as never, parseAction(body));
}

export async function ops() {
  return (await list("workspace_ops")) as Array<Record<string, unknown> & { id: string }>;
}
