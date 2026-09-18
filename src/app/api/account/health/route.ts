import { ADMIN_CONFIGURED, adminAuth, adminDb } from "@/lib/server/admin";
import { describeError } from "@/lib/server/errors";

/**
 * Why the account API is not working, at a URL you can open.
 *
 * Temporary. Every way the privileged half can fail — no service account, a
 * key that will not parse, a key for the wrong project, a key with no
 * Firestore permission — arrives in the browser as the same 500, and reading
 * the difference out of a deployment's runtime logs is slow enough that it
 * gets skipped. This asks Auth and Firestore one question each and reports
 * what they said.
 *
 * It exposes no secret: the service account's address is not a credential, the
 * project id is already in the client bundle, and the private key is never
 * read here. It still comes out once the deployment is settled.
 */

export const dynamic = "force-dynamic";

/** The key's own claims about itself — never the key. */
function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return { present: false, parses: false };
  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    return {
      present: true,
      parses: true,
      projectId: parsed.project_id ?? null,
      clientEmail: parsed.client_email ?? null,
      hasPrivateKey: Boolean(parsed.private_key),
    };
  } catch {
    return { present: true, parses: false };
  }
}

/**
 * Ask Auth about a uid that cannot exist.
 *
 * `auth/user-not-found` is the success case: reaching that answer means the
 * credential was accepted and the round trip worked. Anything else — an
 * `invalid_grant` from a revoked key, a permission error — is the real fault.
 */
async function probeAuth() {
  try {
    await adminAuth().getUser("health-probe-no-such-uid");
    return { ok: true, note: "that uid exists, which is surprising" };
  } catch (error) {
    const described = describeError(error);
    return described.code === "auth/user-not-found"
      ? { ok: true }
      : { ok: false, ...described };
  }
}

/**
 * Read one document that is not personal data.
 *
 * `app_configuration/app` is public by rule and holds the current release, so
 * the probe touches nobody's profile. Missing is fine — the question is
 * whether Firestore answered at all.
 */
async function probeFirestore() {
  try {
    const snap = await adminDb().collection("app_configuration").doc("app").get();
    return { ok: true, exists: snap.exists };
  } catch (error) {
    return { ok: false, ...describeError(error) };
  }
}

export async function GET() {
  const key = serviceAccount();

  if (!ADMIN_CONFIGURED) {
    return Response.json(
      {
        adminConfigured: false,
        serviceAccount: key,
        note: "FIREBASE_SERVICE_ACCOUNT or the project id is missing from this deployment. Vercel injects environment variables at deploy time, so a variable added since this build will not be here until it is redeployed.",
      },
      { status: 503 },
    );
  }

  const [auth, firestore] = await Promise.all([probeAuth(), probeFirestore()]);

  return Response.json(
    {
      adminConfigured: true,
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        null,
      serviceAccount: key,
      auth,
      firestore,
    },
    { status: auth.ok && firestore.ok ? 200 : 500 },
  );
}
