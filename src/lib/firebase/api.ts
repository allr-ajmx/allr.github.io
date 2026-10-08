"use client";

import type { HistoryItem } from "@/lib/billing/history";
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
import type { Quote } from "@/lib/billing/quote";

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
  availableUsd?: number;
  purchasedUsd?: number;
  includedUsd: number;
  remaining: { includedUsd: number; topupUsd: number; grantsUsd: number; availableUsd?: number };
  grants: { id: string; usd: number; expiresAt: string | null; note: string | null }[];
  spentThisCycleUsd: number;
  topupBalanceUsd: number;
  usageSyncedAt: string | null;
};
export type CreditPack = {
  id: string;
  /** List price in USD; charged in the buyer's currency with GST (see fetchQuote). */
  priceUsd: number;
  creditUsd: number;
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
    quote: Quote;
  }>("/account/credits/topup/", { method: "POST", body: JSON.stringify({ pack }) });

/** The bill before Checkout: the workspace plan with this monthly credit, or a credit pack. */
export const fetchQuote = (what: { creditUsd: number } | { pack: string }) =>
  call<Quote>(
    "pack" in what
      ? `/account/billing/quote/?pack=${encodeURIComponent(what.pack)}`
      : `/account/billing/quote/?creditUsd=${Math.max(0, Math.round(what.creditUsd))}`,
  );

export const fetchUrls = () => call<{ urls: PublishedUrl[] }>("/account/urls/");

export const fetchBilling = () => call<BillingSummary>("/account/billing/");

export const fetchBillingHistory = () =>
  call<{ items: HistoryItem[]; invoicesUnavailable: boolean }>("/account/billing/history/");

export const startSubscription = (username?: string, creditUsd = 0) =>
  call<SubscribeResponse>("/account/billing/subscribe/", {
    method: "POST",
    body: JSON.stringify({ ...(username ? { username } : {}), creditUsd }),
  });

export const startCreditSubscription = (amountUsd: number) =>
  call<{
    subscriptionId: string;
    keyId: string;
    amountUsd: number;
    currency: "USD" | "INR";
    amountMinor: number;
    startsAt: string | null;
  }>("/account/billing/credits/", { method: "POST", body: JSON.stringify({ amountUsd }) });

/** Checkout succeeded: apply that subscription now rather than wait for the webhook. */
export const confirmSubscription = (subscriptionId: string) =>
  call<BillingSummary>("/account/billing/confirm/", { method: "POST", body: JSON.stringify({ subscriptionId }) });

export type PlanChange = {
  subscriptionId: string;
  keyId: string;
  kind: "upgrade" | "downgrade";
  plan: SubscribeResponse["plan"];
  chargeNowMinor: number;
  creditNowUsd: number;
  startsAt: string;
};

export const changePlan = (plan: "workspace" | "workspace_ai") =>
  call<PlanChange>("/account/billing/change/", { method: "POST", body: JSON.stringify({ plan }) });

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
  billing: {
    status: string; planCurrency: string; currentPeriodEnd: string | null;
    plan?: "workspace" | "workspace_ai" | null;
    upcoming?: { plan: "workspace" | "workspace_ai"; status: string } | null;
  } | null;
  credits: {
    remaining: { includedUsd: number; topupUsd: number; grantsUsd: number };
    includedMonthlyUsd: number;
    grants: { id: string; usd: number; expiresAt: string | null; note: string | null }[];
    pendingChanges: number;
    spentThisCycleUsd: number;
    topupBalanceUsd: number;
    usageSyncedAt: string | null;
  } | null;
  queue: { status: string; error: string | null; attempts?: number; retryAt?: string | null } | null;
  /** Where billing, queue, account and VPS disagree. */
  issues?: { code: string; message: string }[];
  comp?: { until: string | null; note: string; by: string; at: string } | null;
  purchases?: { paymentId: string; creditUsd: number; amountMinor: number; currency: string; status: string; createdAt: string }[];
  enforcement: { reason: string; suspendedAt: string | null; removeAfter: string | null } | null;
  platform: {
    suspended: boolean;
    agentTag: string | null;
    helixTag: string | null;
    orManaged: boolean | null;
    orDisabled: boolean | null;
    orLimitUsd: number | null;
    orUsageUsd: number | null;
    orUsageDailyUsd: number | null;
    orUsageMonthlyUsd: number | null;
    orHealth: string | null;
    seenAt: string | null;
  } | null;
};

export const fetchAdminCustomers = () =>
  call<{
    customers: AdminCustomer[];
    workspaceOnly: {
      username: string;
      email: string;
      updatedAt: string | null;
      firstSeenAt: string | null;
      suspended?: boolean;
      agentTag?: string | null;
      platform: AdminCustomer["platform"];
      /** An account with this email and no workspace: the admin can link them. */
      matchUid?: string | null;
      matchEmail?: string | null;
    }[];
    flags: {
      id: string; at: string; eventName: string; reason: string; who: string | null;
      paymentId: string | null; subscriptionId: string | null;
    }[];
    pendingOps: {
      id: string; op: string; username: string; status: string; error: string | null;
      attempts: number; retryAt: string | null;
    }[];
  }>("/admin-ui/customers/");

export type AdminActionBody = {
  action:
    | "edit_profile" | "transfer_email" | "grant_credit" | "revoke_grant" | "set_included"
    | "suspend" | "resume" | "provision" | "remove" | "delete_account"
    | "ws_suspend" | "ws_resume" | "ws_set_email" | "ws_remove" | "retry"
    | "promo_create" | "promo_set_active" | "resolve_flag" | "refund_topup" | "set_comp" | "clear_comp" | "link_workspace";
  uid?: string;
  kind?: "provision" | "op";
  id?: string;
  usd?: number;
  username?: string;
  confirm?: string;
  name?: string;
  country?: string;
  email?: string;
  expiresAt?: string | null;
  note?: string;
  grantId?: string;
  refund?: boolean;
  code?: string;
  paymentId?: string;
  until?: string | null;
  maxUses?: number;
  days?: number;
  creditUsd?: number;
  active?: boolean;
};

export const adminAction = (body: AdminActionBody) =>
  call<{ ok: true }>("/admin-ui/actions/", { method: "POST", body: JSON.stringify(body) });

export type AdminPromoCode = {
  code: string;
  active: boolean;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  days: number;
  creditUsd: number;
  note?: string;
  createdAt: string | null;
  createdBy: string | null;
};

export const fetchAdminPromos = () =>
  call<{
    codes: AdminPromoCode[];
    redemptions: { email: string; code: string; redeemedAt: string | null; endsAt: string | null }[];
  }>("/admin-ui/promos/");

export const redeemPromoCode = (code: string, username?: string) =>
  call<{ promo: { code: string; endsAt: string; creditUsd: number } }>("/account/promo/redeem/", {
    method: "POST",
    body: JSON.stringify({ code, ...(username ? { username } : {}) }),
  });

export const fetchAdminOperations = () =>
  call<{
    events: {
      at: string;
      kind: "lifecycle" | "admin" | "billing" | "credit" | "ops" | "provision";
      summary: string;
      detail: string | null;
      status: string | null;
    }[];
  }>("/admin-ui/operations/");
