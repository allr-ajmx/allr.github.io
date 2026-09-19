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
import { ApiCallFailed, fetchMe } from "@/lib/firebase/api";
import type { UserProfile } from "@/lib/account/model";
import type { JourneyState } from "@/lib/account/state";

/**
 * Who is signed in, and where they are in the early-access journey.
 *
 * The profile and the journey state both come from `GET /api/account/me` rather
 * than from Firestore directly. The browser could read its own document — the
 * rules allow that much — but the state is derived on the server, and deriving
 * it twice is how the two ends start disagreeing about whether somebody has a
 * workspace.
 *
 * `needsProfile` is a real state rather than "signed in with no data": someone
 * who has authenticated with Google but never asked for early access has an
 * account with Firebase and no account with us.
 */

export type AuthStatus =
  | "loading"
  | "signedOut"
  /** Signed in, but the account could not be loaded. */
  | "error"
  /** One of the journey states — the account loaded fine. */
  | JourneyState;

type AuthValue = {
  status: AuthStatus;
  user: User | null;
  profile: UserProfile | null;
  /**
   * True when the account could not be reached at all, rather than refused.
   * One is "your network, or our outage"; the other is a bug on our side and
   * retrying will not help.
   */
  unreachable: boolean;
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
      const { profile: found, state } = await fetchMe();
      setProfile(found);
      setUnreachable(false);
      setStatus(state);
    } catch (error) {
      // A refused call is a bug; a call that never landed is a connection.
      setUnreachable(
        !(error instanceof ApiCallFailed) || error.status >= 500 || error.status === 0,
      );
      setProfile(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let live = true;
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
