"use client";

import { getAllrAuth } from "./app";
import type {
  ProfileDraft,
  ProfilePatch,
  PublishedUrl,
  UserProfile,
} from "@/lib/account/model";
import type { JourneyState } from "@/lib/account/state";

/**
 * The browser's half of the account API.
 *
 * Everything that changes an account goes through here rather than through the
 * Firestore SDK, because firestore.rules refuses client writes to `users`
 * outright. The token is attached per request instead of a session cookie —
 * there is no cookie to attach, and Firebase already holds a refreshable
 * credential.
 */

export class ApiCallFailed extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.auth !== false) {
    const user = getAllrAuth().currentUser;
    if (!user) throw new ApiCallFailed("signed-out", "You are not signed in.", 401);
    // Firebase refreshes this itself when it is close to expiring, so asking
    // for it per call is cheap and always current.
    headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  }
  if (init.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...init, headers });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // A non-JSON body means something failed before the route ran.
  }

  if (!res.ok) {
    const error = (payload as { error?: { code?: string; message?: string } })?.error;
    throw new ApiCallFailed(
      error?.code ?? "unknown",
      error?.message ?? "Something went wrong. Try again in a moment?",
      res.status,
    );
  }
  return payload as T;
}

export type MeResponse = { profile: UserProfile | null; state: JourneyState };

export const fetchMe = () => call<MeResponse>("/account/me");

export const registerAccount = (draft: ProfileDraft) =>
  call<{ profile: UserProfile }>("/account/register", {
    method: "POST",
    body: JSON.stringify(draft),
  });

export const patchProfile = (patch: ProfilePatch) =>
  call<{ profile: UserProfile }>("/account/profile", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export type CreditResponse = {
  credit: {
    grantedUsd: number;
    usedUsd: number;
    remainingUsd: number;
    startedAt: string;
    endsAt: string;
    daysLeft: number;
  } | null;
  state: JourneyState;
  /** True while nothing meters AI spend — see the route. */
  mocked: boolean;
};

export const fetchCredits = () => call<CreditResponse>("/account/credits");

export const fetchUrls = () => call<{ urls: PublishedUrl[] }>("/account/urls");
