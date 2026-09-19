"use client";

import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { AUTH_CONFIGURED, AuthNotConfigured, getAllrAuth } from "./app";

export type { User };

/**
 * Google, and only Google (DESIGN.md §16).
 *
 * The site is a static export: there is no server, so there is no password we
 * could store safely and no session cookie we could set. One provider also
 * means one identity per person — no "I signed up with the other button"
 * support thread, and an email address we know Google has verified, which the
 * Firestore rules then check against the token rather than trusting the form.
 */

/** Thrown when the person closed the Google window, or the browser blocked it. */
export class SignInDismissed extends Error {}
export class SignInBlocked extends Error {}

/**
 * Thrown when the project is not set up to accept this sign-in yet.
 *
 * These are the two failures that greet a first deploy, and they look identical
 * to a visitor unless we separate them: the Google provider is still switched
 * off in the Firebase console (`auth/operation-not-allowed`), or the domain the
 * site is served from was never added to the authorized list
 * (`auth/unauthorized-domain`). Both are ours to fix, not theirs, and the page
 * should say so rather than invite them to try again forever.
 */
export class SignInNotEnabled extends Error {
  constructor(readonly reason: "provider" | "domain") {
    super(
      reason === "provider"
        ? "Google sign-in is not enabled on this Firebase project."
        : "This domain is not in the Firebase authorized domains list.",
    );
  }
}

export function signInWithGoogle(): Promise<User> {
  if (!AUTH_CONFIGURED) return Promise.reject(new AuthNotConfigured());

  const auth = getAllrAuth();
  const provider = new GoogleAuthProvider();
  // Always show the chooser. Without this, someone signed into one Google
  // account is silently signed in as that account with no way to pick another.
  provider.setCustomParameters({ prompt: "select_account" });

  return (
    setPersistence(auth, browserLocalPersistence)
      // Popup, never redirect. `signInWithRedirect` stores its state on the
      // authDomain, which browsers now partition as third-party — it breaks
      // wherever the app is not served from the auth handler's own origin, and
      // on GitHub Pages it never is.
      .then(() => signInWithPopup(auth, provider))
      .then((result) => result.user)
      .catch((error: unknown) => {
        const code = (error as { code?: string })?.code;
        if (
          code === "auth/popup-closed-by-user" ||
          code === "auth/cancelled-popup-request"
        ) {
          throw new SignInDismissed();
        }
        if (code === "auth/popup-blocked") throw new SignInBlocked();
        if (code === "auth/operation-not-allowed") {
          throw new SignInNotEnabled("provider");
        }
        if (code === "auth/unauthorized-domain") {
          throw new SignInNotEnabled("domain");
        }
        throw error;
      })
  );
}

export function signOutOfAllr(): Promise<void> {
  if (!AUTH_CONFIGURED) return Promise.resolve();
  return signOut(getAllrAuth());
}

/**
 * Subscribe to the signed-in user. Calls back with `null` when signed out, and
 * always calls back at least once — including in a build with no Firebase
 * config, where the answer is simply "nobody".
 */
export function onUser(cb: (user: User | null) => void): () => void {
  if (!AUTH_CONFIGURED) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(getAllrAuth(), cb);
}
