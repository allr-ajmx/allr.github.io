/**
 * The outbox's rules, pure: how an email is keyed so one event is one email,
 * when a failed send is retried, and when a queued email is too old to send.
 */

import type { MailKind, OutboxStatus } from "./types.ts";

/**
 * One email per event. The key is the kind, the account and the caller's
 * `ref` for the occurrence (a subscription id, a payment id, a paid_count),
 * so a redelivered webhook or a reconciler pass enqueues the same row again
 * and the drain sends nothing twice.
 */
export function mailKey(kind: MailKind, uid: string | null, ref = ""): string {
  // Firestore document ids: no "/", and the key must read as one line in the console.
  const clean = (s: string) => s.replace(/[^A-Za-z0-9_.@:-]/g, "_");
  return [kind, clean(uid ?? "admin"), clean(ref)].filter(Boolean).join(":").slice(0, 400);
}

/**
 * Delivery retries: an SMTP blip heals in a minute, an outage in hours; after
 * a day of trying the row is left `failed` for a person to see.
 */
export const MAIL_MAX_ATTEMPTS = 8;
/** Wait before attempt n+1, indexed by attempts made so far. */
export const MAIL_BACKOFF_MS = [
  0,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
];

export type MailRetry =
  | { attempts: number; status: "failed"; retryAt: null }
  | { attempts: number; status: "queued"; retryAt: string };

/** After a failed attempt: requeue with backoff, or give up. */
export function nextMailAttempt(attempts: number, now = Date.now()): MailRetry {
  const next = Math.max(0, attempts) + 1;
  if (next >= MAIL_MAX_ATTEMPTS) return { attempts: next, status: "failed", retryAt: null };
  return { attempts: next, status: "queued", retryAt: new Date(now + MAIL_BACKOFF_MS[next]).toISOString() };
}

export function isDue(retryAt: string | null | undefined, now = Date.now()): boolean {
  if (!retryAt) return true;
  const t = Date.parse(retryAt);
  return !Number.isFinite(t) || t <= now;
}

/**
 * An email that waited this long is old news — a "payment received" from
 * three days ago, sent the day SMTP is finally configured, would only
 * confuse. Expired rows are kept for the record, not sent.
 */
export const MAIL_MAX_AGE_MS = 3 * 86_400_000;

export function isStale(queuedAt: string | null | undefined, now = Date.now()): boolean {
  const t = queuedAt ? Date.parse(queuedAt) : NaN;
  return Number.isFinite(t) && now - t > MAIL_MAX_AGE_MS;
}

/** A `sending` claim older than this belongs to a function that died mid-send. */
export const CLAIM_STALE_MS = 5 * 60_000;

export function claimIsStale(claimedAt: string | null | undefined, now = Date.now()): boolean {
  const t = claimedAt ? Date.parse(claimedAt) : NaN;
  return !Number.isFinite(t) || now - t > CLAIM_STALE_MS;
}

/** What the drain does with a row it has just read inside its claim transaction. */
export function claimDecision(
  row: { status?: unknown; sentAt?: unknown; queuedAt?: unknown; retryAt?: unknown; claimedAt?: unknown },
  now = Date.now(),
): "send" | "already-sent" | "expired" | "not-due" | "skip" {
  const status = row.status as OutboxStatus | undefined;
  if (typeof row.sentAt === "string" && row.sentAt) return "already-sent";
  if (status === "sending") return claimIsStale(row.claimedAt as string | null, now) ? "send" : "skip";
  if (status !== "queued") return "skip";
  if (isStale(row.queuedAt as string | null, now)) return "expired";
  if (!isDue(row.retryAt as string | null, now)) return "not-due";
  return "send";
}
