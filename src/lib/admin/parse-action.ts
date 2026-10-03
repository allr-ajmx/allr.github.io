/**
 * Admin action parsing — pure, so the server's security boundary is tested
 * exactly as it runs. Returns a verdict; the server turns refusals into 400s.
 */

import { checkUsernameShape } from "./username.ts";
import { isCountryCode } from "../countries.ts";
import { MAX_NAME } from "../account/model.ts";
import {
  normalizeCode,
  PROMO_CREDIT_USD_DEFAULT,
  PROMO_DAYS_DEFAULT,
  PROMO_MAX_CREDIT_USD,
  PROMO_MAX_DAYS,
  PROMO_MAX_USES,
} from "../billing/promo.ts";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_GRANT_USD = 500;

// No parameter properties: Node's type-stripping test runner can't run them.
export class ActionRefused extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
const badRequest = (code: string, message: string) => new ActionRefused(code, message);

export type AdminAction =
  | { action: "edit_profile"; uid: string; name?: string; country?: string }
  | { action: "transfer_email"; uid: string; email: string }
  | { action: "grant_credit"; uid: string; usd: number; expiresAt: string | null; note: string }
  | { action: "revoke_grant"; uid: string; grantId: string }
  | { action: "set_included"; uid: string; usd: number }
  | { action: "suspend"; uid: string }
  | { action: "resume"; uid: string }
  | { action: "provision"; uid: string; username: string }
  /** Destructive: containers and data. `confirm` must equal the username.
   *  Also cancels the subscription; `refund` refunds the last paid charge. */
  | { action: "remove"; uid: string; confirm: string; refund: boolean }
  /** Destructive: the site account itself (no workspace may remain).
   *  `confirm` must equal the account's email. */
  | { action: "delete_account"; uid: string; confirm: string }
  /** Roster-only workspaces (no site account yet): keyed by username. */
  | { action: "ws_suspend"; username: string }
  | { action: "ws_resume"; username: string }
  | { action: "ws_set_email"; username: string; email: string }
  | { action: "ws_remove"; username: string; confirm: string }
  /** Put a failed provision (id = uid) or op (id = op doc id) back in the queue. */
  | { action: "retry"; kind: "provision" | "op"; id: string }
  /** Promotional codes: a free month (no payment), capped and optionally expiring. */
  | {
      action: "promo_create";
      code: string;
      maxUses: number;
      expiresAt: string | null;
      days: number;
      creditUsd: number;
      note: string;
    }
  | { action: "promo_set_active"; code: string; active: boolean }
  /** A flagged billing event has been looked at. */
  | { action: "resolve_flag"; id: string; note: string }
  /** Refund a credit pack (full) and take back its unspent credit. */
  | { action: "refund_topup"; paymentId: string };

/** Firestore doc ids we mint: `<uid>`, `<uid>:<op>`, `ws:<username>:<op>`. */
const DOC_ID_RE = /^[A-Za-z0-9_.:-]{1,200}$/;

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function parseEmail(v: unknown): string {
  const email = str(v).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw badRequest("invalid", "That doesn’t look like an email address.");
  }
  return email;
}

function parseUsd(v: unknown, min: number, label: string): number {
  const usd = Number(v);
  if (!Number.isFinite(usd) || usd < min || usd > MAX_GRANT_USD) {
    throw badRequest("invalid", `${label} must be between $${min} and $${MAX_GRANT_USD}.`);
  }
  return Math.round(usd * 100) / 100;
}

export function parseAction(body: unknown, now: Date = new Date()): AdminAction {
  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.action === "string" && b.action.startsWith("ws_")) {
    const verdict = checkUsernameShape(b.username);
    if (!verdict.ok) throw badRequest("bad-username", verdict.reason);
    const username = verdict.username;
    switch (b.action) {
      case "ws_suspend":
        return { action: "ws_suspend", username };
      case "ws_resume":
        return { action: "ws_resume", username };
      case "ws_set_email":
        return { action: "ws_set_email", username, email: parseEmail(b.email) };
      case "ws_remove":
        if (str(b.confirm).toLowerCase() !== username) {
          throw badRequest("confirm", "Name the workspace exactly to confirm removal.");
        }
        return { action: "ws_remove", username, confirm: username };
      default:
        throw badRequest("invalid", "Unknown action.");
    }
  }

  if (b.action === "promo_create" || b.action === "promo_set_active") {
    const code = normalizeCode(b.code);
    if (!code) throw badRequest("invalid", "Codes are 3–32 letters, digits or dashes, like LAUNCH-2026.");
    if (b.action === "promo_set_active") {
      if (typeof b.active !== "boolean") throw badRequest("invalid", "active must be true or false.");
      return { action: "promo_set_active", code, active: b.active };
    }
    const int = (v: unknown, min: number, max: number, label: string) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) throw badRequest("invalid", `${label} must be a whole number from ${min} to ${max}.`);
      return n;
    };
    const maxUses = int(b.maxUses, 1, PROMO_MAX_USES, "Max uses");
    const days = b.days === undefined || b.days === "" ? PROMO_DAYS_DEFAULT : int(b.days, 1, PROMO_MAX_DAYS, "Days");
    const credit = b.creditUsd === undefined || b.creditUsd === "" ? PROMO_CREDIT_USD_DEFAULT : Number(b.creditUsd);
    if (!Number.isFinite(credit) || credit < 0 || credit > PROMO_MAX_CREDIT_USD) {
      throw badRequest("invalid", `Credit must be between $0 and $${PROMO_MAX_CREDIT_USD}.`);
    }
    let expiresAt: string | null = null;
    if (b.expiresAt !== undefined && b.expiresAt !== null && str(b.expiresAt) !== "") {
      const t = Date.parse(str(b.expiresAt));
      if (!Number.isFinite(t)) throw badRequest("invalid", "Expiry must be a date, like 2026-12-31.");
      if (t <= now.getTime()) throw badRequest("invalid", "Expiry must be in the future.");
      expiresAt = new Date(t).toISOString();
    }
    return {
      action: "promo_create",
      code,
      maxUses,
      expiresAt,
      days,
      creditUsd: Math.round(credit * 100) / 100,
      note: str(b.note).slice(0, 120),
    };
  }

  if (b.action === "resolve_flag") {
    const id = str(b.id);
    if (!/^[A-Za-z0-9_.:\-]{1,200}$/.test(id) || id.includes("..")) throw badRequest("invalid", "Bad id.");
    return { action: "resolve_flag", id, note: str(b.note).slice(0, 200) };
  }
  if (b.action === "refund_topup") {
    const paymentId = str(b.paymentId);
    if (!/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId)) throw badRequest("invalid", "That isn't a Razorpay payment id.");
    return { action: "refund_topup", paymentId };
  }

  if (b.action === "retry") {
    const id = str(b.id);
    if (b.kind !== "provision" && b.kind !== "op") throw badRequest("invalid", "Retry what?");
    if (!DOC_ID_RE.test(id) || id.includes("..")) throw badRequest("invalid", "Bad id.");
    return { action: "retry", kind: b.kind, id };
  }

  const uid = str(b.uid);
  if (!uid) throw badRequest("invalid", "uid is required.");

  switch (b.action) {
    case "edit_profile": {
      const name = b.name === undefined ? undefined : str(b.name);
      const country = b.country === undefined ? undefined : str(b.country).toUpperCase();
      if (name === undefined && country === undefined) {
        throw badRequest("invalid", "Nothing to change.");
      }
      if (name !== undefined && (name.length < 2 || name.length > MAX_NAME)) {
        throw badRequest("invalid", `Names are 2–${MAX_NAME} characters.`);
      }
      if (country !== undefined && !isCountryCode(country)) {
        throw badRequest("invalid", "Use a two-letter country code, like IN or US.");
      }
      return { action: "edit_profile", uid, name, country };
    }
    case "transfer_email":
      return { action: "transfer_email", uid, email: parseEmail(b.email) };
    case "grant_credit": {
      const usd = parseUsd(b.usd, 0.01, "A grant");
      let expiresAt: string | null = null;
      if (b.expiresAt !== undefined && b.expiresAt !== null && str(b.expiresAt) !== "") {
        const t = Date.parse(str(b.expiresAt));
        if (!Number.isFinite(t)) throw badRequest("invalid", "Expiry must be a date, like 2026-12-31.");
        if (t <= now.getTime()) throw badRequest("invalid", "Expiry must be in the future.");
        expiresAt = new Date(t).toISOString();
      }
      return { action: "grant_credit", uid, usd, expiresAt, note: str(b.note).slice(0, 120) };
    }
    case "revoke_grant": {
      const grantId = str(b.grantId);
      if (!grantId) throw badRequest("invalid", "Which grant?");
      return { action: "revoke_grant", uid, grantId };
    }
    case "set_included":
      return { action: "set_included", uid, usd: parseUsd(b.usd, 0, "Monthly included credit") };
    case "suspend":
      return { action: "suspend", uid };
    case "resume":
      return { action: "resume", uid };
    case "remove":
      if (!str(b.confirm)) throw badRequest("confirm", "Name the workspace to confirm removal.");
      return { action: "remove", uid, confirm: str(b.confirm).toLowerCase(), refund: b.refund === true };
    case "delete_account":
      if (!str(b.confirm)) throw badRequest("confirm", "Name the account's email to confirm deletion.");
      return { action: "delete_account", uid, confirm: str(b.confirm).toLowerCase() };
    case "provision": {
      const verdict = checkUsernameShape(b.username);
      if (!verdict.ok) throw badRequest("bad-username", verdict.reason);
      return { action: "provision", uid, username: verdict.username };
    }
    default:
      throw badRequest("invalid", "Unknown action.");
  }
}

