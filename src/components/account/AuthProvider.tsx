"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onUser, type User } from "@/lib/firebase/auth";
import { readProfile, type UserProfile } from "@/lib/firebase/profile";

/**
 * Who is signed in, and have they finished registering.
 *
 * There is no server and no session cookie, so this — plus the Firestore rules —
 * is the entire access story. Everything under `/account` is exported as a
 * static shell that knows nothing about the visitor; this provider is what
 * turns that shell into somebody's page once it reaches the browser.
 *
 * `needsProfile` is a real state rather than "signed in with no data": someone
 * who has authenticated with Google but never filled in the registration form
 * has an account with Firebase and no account with us, and the two must not be
 * confused.
 */

export type AuthStatus =
  | "loading"
  | "signedOut"
  | "needsProfile"
  | "ready"
  /** Signed in, but the profile could not be read (offline, rules, outage). */
  | "error";

type AuthValue = {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  /**
   * True when the profile read failed because the database could not be
   * reached at all, rather than because it refused us. Worth separating: one
   * is "your network, or our outage, try again", the other is a bug on our
   * side and no amount of retrying will help.
   */
  unreachable: boolean;
  /** Re-read the profile — call after registering or editing, or to retry. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [unreachable, setUnreachable] = useState(false);

  const load = useCallback(async (current: User | null) => {
    if (!current) {
      setProfile(null);
      setStatus("signedOut");
      return;
    }
    try {
      const found = await readProfile(current.uid);
      setProfile(found);
      setUnreachable(false);
      setStatus(found ? "ready" : "needsProfile");
    } catch (error) {
      // Firestore reports a backend it cannot talk to as "unavailable" — in
      // development that is almost always the emulator not running.
      const code = (error as { code?: string })?.code;
      setUnreachable(code === "unavailable" || code === "deadline-exceeded");
      setProfile(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let live = true;
    // Fires immediately with the persisted user, then on every change. In a
    // build with no Firebase config it fires once with null, so the login page
    // still renders rather than hanging on "loading" forever.
    const unsubscribe = onUser((next) => {
      if (!live) return;
      setUser(next);
      setStatus("loading");
      void load(next);
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load(user);
  }, [load, user]);

  const value = useMemo(
    () => ({ status, user, profile, unreachable, refresh }),
    [status, user, profile, unreachable, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return value;
}
