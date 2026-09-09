/**
 * Walk the whole early-access journey against the emulator.
 *
 * Not a unit test — it needs `pnpm emulate` and `pnpm dev:emulated` running,
 * because the point is to exercise the real API routes, the real Admin SDK and
 * the real rules together.
 *
 * The case that matters most is the second one. A person registered, their auth
 * account was deleted, and their next sign-in minted a *new uid* with the same
 * email address — which used to produce a second profile, because the document
 * id is the uid and nothing said an address could only be claimed once. That is
 * how a real duplicate happened, so it is what this reproduces.
 *
 *   node scripts/verify-journey.mjs [baseUrl]
 */

import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithCredential,
  signOut,
} from "firebase/auth";

const BASE = process.argv[2] ?? "http://localhost:3000";
const AUTH = "127.0.0.1:9099";
const FIRESTORE = "127.0.0.1:8571";
const PROJECT = "demo-allr";
const EMAIL = "journey@example.com";

let failures = 0;
const ok = (label, pass, detail = "") => {
  console.log(`  ${pass ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

const app = initializeApp({
  apiKey: "demo-key",
  projectId: PROJECT,
  authDomain: `${PROJECT}.firebaseapp.com`,
});
const auth = getAuth(app);
connectAuthEmulator(auth, `http://${AUTH}`, { disableWarnings: true });

const signIn = async (sub) => {
  await signOut(auth).catch(() => {});
  const { user } = await signInWithCredential(
    auth,
    GoogleAuthProvider.credential(
      JSON.stringify({ sub, email: EMAIL, email_verified: true, name: "Journey Tester" }),
    ),
  );
  return user;
};

const api = async (path, init = {}) => {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const draft = {
  name: "Journey Tester",
  dateOfBirth: "1990-04-02",
  country: "GB",
  accountType: "individual",
  entityName: "",
  marketingOptIn: false,
  mobilePlatforms: ["ios", "android"],
};

/** Admin-side writes, the way the provisioning program would make them. */
const patchUser = (uid, fields) =>
  fetch(
    `http://${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}?` +
      Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
      body: JSON.stringify({ fields }),
    },
  );

// A clean slate, so the run is repeatable.
await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
// The emulator-only endpoint. The plain /v1/ path is the real API and will not
// empty a database, so using it leaves the previous run's email claims behind
// and the next registration is refused as a duplicate of itself.
await fetch(
  `http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
  { method: "DELETE" },
);

console.log("\n1. Registering");
const first = await signIn("google-journey-1");
{
  const { status, body } = await api("/account/register/", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  ok("registration succeeds", status === 201, `HTTP ${status}`);
  ok("the email is the verified one", body?.profile?.email === EMAIL, body?.profile?.email);
  ok("no workspace yet", body?.profile?.workspace_username === null);
}
{
  const { body } = await api("/account/me/");
  ok("state is `requested`", body?.state === "requested", body?.state);
}

console.log("\n2. Registering twice");
{
  const { status, body } = await api("/account/register/", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  ok("the same account is refused", status === 409, `HTTP ${status} ${body?.error?.code ?? ""}`);
}

console.log("\n3. Approval");
await patchUser(first.uid, {
  workspace_username: { stringValue: "journey" },
  workspace_email: { stringValue: "journey@allr.work" },
  workspace_address: { stringValue: "https://journey.allr.work" },
});
await signIn("google-journey-1");
{
  const { body } = await api("/account/me/");
  ok("state becomes `active`", body?.state === "active", body?.state);
  ok("the trial was stamped", Boolean(body?.profile?.trial), JSON.stringify(body?.profile?.trial ?? null));
  ok("credit is $5", body?.profile?.trial?.creditUsd === 5);
}
{
  const { body } = await api("/account/credits/");
  ok("credits report days left", (body?.credit?.daysLeft ?? 0) > 0, `${body?.credit?.daysLeft} days`);
  ok("credits admit to being mocked", body?.mocked === true);
}

console.log("\n4. When the free week runs out");
await patchUser(first.uid, {
  trial: {
    mapValue: {
      fields: {
        startedAt: { timestampValue: "2020-01-01T00:00:00Z" },
        endsAt: { timestampValue: "2020-01-08T00:00:00Z" },
        creditUsd: { integerValue: "5" },
        creditUsedUsd: { integerValue: "0" },
      },
    },
  },
});
{
  const { body } = await api("/account/me/");
  ok("state becomes `trialEnded`", body?.state === "trialEnded", body?.state);
}

console.log("\n5. The bug: a new uid for the same address");
await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
const second = await signIn("google-journey-2");
{
  ok("the uid really did change", second.uid !== first.uid, `${first.uid} → ${second.uid}`);
  const { status, body } = await api("/account/register/", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  ok(
    "a second account for one address is refused",
    status === 409 && body?.error?.code === "email-taken",
    `HTTP ${status} ${body?.error?.code ?? ""}`,
  );
}

console.log("\n6. Refusals");
{
  await signOut(auth);
  const { status } = await api("/account/me/");
  ok("signed out is refused", status === 401, `HTTP ${status}`);
}

console.log(
  failures === 0
    ? "\n✓ The whole journey behaves.\n"
    : `\n✗ ${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
