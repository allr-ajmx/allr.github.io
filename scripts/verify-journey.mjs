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
/**
 * A fresh address every run, so nothing has to be cleaned up.
 *
 * This used to empty the emulator first, which made it repeatable and also
 * destroyed whatever anybody else was working on — I deleted a real test
 * account that way. Unique identities cost nothing and touch nothing.
 */
const RUN = Date.now();
const EMAIL = `journey+${RUN}@example.com`;

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
  country: "IN",
  accountType: "individual",
  entityName: "",
  marketingOptIn: false,
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

/** Remove one identity, never the whole emulator. */
const deleteAccount = (localId) =>
  fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
      body: JSON.stringify({ localId }),
    },
  );

console.log(`Using ${EMAIL} — nothing else in the emulator is touched.`);

console.log("\n1. Registering");
const first = await signIn(`google-${RUN}-1`);
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
  ok("state is `registered`, not queued", body?.state === "registered", body?.state);
  ok("no tester track chosen yet", (body?.profile?.mobilePlatforms ?? []).length === 0);
}

console.log("\n1b. Asking for early access");
{
  const { status } = await api("/account/early-access/", {
    method: "POST",
    body: JSON.stringify({ mobilePlatforms: [] }),
  });
  ok("an empty tester track is refused", status === 400, `HTTP ${status}`);
}
{
  const { status } = await api("/account/early-access/", {
    method: "POST",
    body: JSON.stringify({ mobilePlatforms: ["ios", "android"] }),
  });
  ok("the request is accepted", status === 200, `HTTP ${status}`);
  const { body } = await api("/account/me/");
  ok("state becomes `requested`", body?.state === "requested", body?.state);
  ok("both tracks were recorded", (body?.profile?.mobilePlatforms ?? []).length === 2);
  const first = body?.profile?.earlyAccessRequestedAt;
  await api("/account/early-access/", {
    method: "POST",
    body: JSON.stringify({ mobilePlatforms: ["ios"] }),
  });
  const { body: again } = await api("/account/me/");
  ok(
    "asking twice keeps the original place in the queue",
    again?.profile?.earlyAccessRequestedAt === first,
  );
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
await signIn(`google-${RUN}-1`);
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
await deleteAccount(first.uid);
const second = await signIn(`google-${RUN}-2`);
{
  ok("the uid really did change", second.uid !== first.uid, `${first.uid} → ${second.uid}`);

  // The address is the person, not the uid. The old identity no longer exists,
  // so the account comes back rather than the person being locked out between
  // a signup form that refuses them and a profile they cannot reach.
  const { body } = await api("/account/me/");
  ok("the stranded account is adopted", Boolean(body?.profile), body?.state);
  ok(
    "it is the same account, not a new one",
    body?.profile?.email === EMAIL && body?.profile?.uid === second.uid,
    body?.profile?.uid,
  );
  ok("its workspace survived the move", Boolean(body?.profile?.workspace_username));

  const { status, body: reg } = await api("/account/register/", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  ok(
    "registering again is still refused",
    status === 409,
    `HTTP ${status} ${reg?.error?.code ?? ""}`,
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
