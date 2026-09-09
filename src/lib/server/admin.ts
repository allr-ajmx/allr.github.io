import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * The privileged half of Firebase.
 *
 * The browser holds a public API key and is bound by firestore.rules. This is
 * bound by nothing, which is the point: it is the only thing that can write a
 * profile, claim an email address, or set the workspace and trial fields that
 * decide whether somebody has been approved. If the person being described
 * could write those, approval would be self-service.
 *
 * Never import this from a client component — `server-only` turns that mistake
 * into a build error rather than a leaked service account.
 */

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "";

/**
 * The Admin SDK reads these itself and talks to the emulators when they are
 * set, using no credentials at all. `pnpm dev:emulated` sets both, so local
 * development exercises this exact code path rather than a stub.
 */
const USING_EMULATOR = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST,
);

export class AdminNotConfigured extends Error {
  constructor() {
    super(
      "FIREBASE_SERVICE_ACCOUNT is not set, so the server cannot reach Firebase.",
    );
  }
}

/** Whether the privileged side can work at all in this deployment. */
export const ADMIN_CONFIGURED =
  USING_EMULATOR || Boolean(process.env.FIREBASE_SERVICE_ACCOUNT && PROJECT_ID);

function app() {
  if (getApps().length) return getApp();
  if (!ADMIN_CONFIGURED) throw new AdminNotConfigured();

  if (USING_EMULATOR) {
    // No credential: against an emulator there is nothing to authenticate to.
    return initializeApp({ projectId: PROJECT_ID || "demo-allr" });
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT as string;
  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the whole key file.",
    );
  }
  return initializeApp({
    credential: cert({
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      // Vercel's env editor turns real newlines into \n; both forms work.
      privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
    }),
    projectId: parsed.project_id || PROJECT_ID,
  });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
