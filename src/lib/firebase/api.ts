"use client";

import { getAllrAuth } from "./app";
import type {
  EarlyAccessRequest,
  ProfileDraft,
  ProfilePatch,
  PublishedUrl,
  UserProfile,
} from "@/lib/account/model";
import type { JourneyState } from "@/lib/account/state";
import type { Billing, BillingSummary, SubscribeResponse } from "@/lib/billing/model";

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

export type MeResponse = { profile: UserProfile | null; state: JourneyState; isAdmin?: boolean };

export const fetchMe = () => call<MeResponse>("/account/me/");

export const registerAccount = (draft: ProfileDraft) =>
  call<{ profile: UserProfile }>("/account/register/", {
    method: "POST",
    body: JSON.stringify(draft),
  });

export const requestEarlyAccess = (request: EarlyAccessRequest) =>
  call<{ profile: UserProfile }>("/account/early-access/", {
    method: "POST",
    body: JSON.stringify(request),
  });

export const patchProfile = (patch: ProfilePatch) =>
  call<{ profile: UserProfile }>("/account/profile/", {
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

export const fetchCredits = () => call<CreditResponse>("/account/credits/");

export type LedgerSummary = {
  includedUsd: number;
  remaining: { includedUsd: number; topupUsd: number };
  spentThisCycleUsd: number;
  topupBalanceUsd: number;
  usageSyncedAt: string | null;
};
export type CreditPack = {
  id: string;
  creditUsd: number;
  display: { USD: string; INR: string };
};
export type LedgerResponse = CreditResponse & {
  ledger?: LedgerSummary;
  packs?: CreditPack[];
};

export const fetchLedger = () => call<LedgerResponse>("/account/credits/");

export const startTopup = (pack: string) =>
  call<{
    orderId: string;
    keyId: string;
    amountMinor: number;
    currency: "USD" | "INR";
    display: string;
    creditUsd: number;
  }>("/account/credits/topup/", { method: "POST", body: JSON.stringify({ pack }) });

export const fetchUrls = () => call<{ urls: PublishedUrl[] }>("/account/urls/");

export const fetchBilling = () => call<BillingSummary>("/account/billing/");

export const startSubscription = (username?: string) =>
  call<SubscribeResponse>("/account/billing/subscribe/", {
    method: "POST",
    body: JSON.stringify(username ? { username } : {}),
  });

export const checkUsername = (u: string) =>
  call<{ available: boolean; reason: string | null }>(
    `/account/username/?u=${encodeURIComponent(u)}`,
  );

export const cancelSubscription = () =>
  call<{ billing: Billing }>("/account/billing/cancel/", { method: "POST" });

export type AdminCustomer = {
  uid: string;
  email: string;
  name: string;
  country: string;
  createdAt: string | null;
  state: JourneyState;
  workspace: { username: string; address: string } | null;
  pendingUsername: string | null;
  billing: { status: string; planCurrency: string; currentPeriodEnd: string | null } | null;
  credits: {
    remaining: { includedUsd: number; topupUsd: number };
    spentThisCycleUsd: number;
    topupBalanceUsd: number;
    usageSyncedAt: string | null;
  } | null;
  queue: { status: string; error: string | null } | null;
};

export const fetchAdminCustomers = () =>
  call<{
    customers: AdminCustomer[];
    workspaceOnly: { username: string; email: string; updatedAt: string | null }[];
    pendingOps: { id: string; op: string; username: string; status: string; error: string | null }[];
  }>("/admin-ui/customers/");

export const adminAction = (body: {
  action: "grant_credit" | "set_included" | "suspend" | "resume" | "provision";
  uid: string;
  usd?: number;
  username?: string;
}) => call<{ ok: true }>("/admin-ui/actions/", { method: "POST", body: JSON.stringify(body) });
