"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  AUTH_CONFIGURED,
  AUTH_EMULATOR_URL,
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  USING_EMULATOR,
} from "./env";

/**
 * The one place the Firebase SDK is constructed.
 *
 * Nothing on a marketing page may import from this directory. The SDK is
 * ~150 KB and the homepage has no use for it; keeping every import inside
 * `/login` and `/account` is what lets Next split it into its own chunk. There
 * is a check for this in the verification pass — if the homepage bundle ever
 * starts naming Firebase, an import crossed the line.
 *
 * The config is public by design, exactly as the waitlist's is: a web API key
 * identifies a project, it does not authorise anything. `firebase/firestore.rules`
 * is the whole security boundary.
 */

export {
  AUTH_CONFIGURED,
  AUTH_EMULATOR_URL,
  FIRESTORE_EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  FIRESTORE_HOST,
  USING_EMULATOR,
} from "./env";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export class AuthNotConfigured extends Error {
  constructor() {
    super("Firebase is not configured in this build.");
  }
}

function getFirebaseApp(): FirebaseApp {
  if (!AUTH_CONFIGURED) throw new AuthNotConfigured();
  if (app) return app;
  // `next dev`'s fast refresh re-runs this module; a second initializeApp with
  // the same name throws.
  app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: FIREBASE_API_KEY,
        // Google hosts the OAuth handshake on this domain. It is not where the
        // site lives, which is why the popup flow is the only one that works
        // on GitHub Pages (see `auth.ts`).
        authDomain: FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: FIREBASE_PROJECT_ID,
      });
  return app;
}

export function getAllrAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (USING_EMULATOR) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  }
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  if (USING_EMULATOR) {
    connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  }
  return db;
}
