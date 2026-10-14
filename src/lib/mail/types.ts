/**
 * Every email the site sends, as data.
 *
 * A message is a kind plus the facts the words need — never the words. The
 * copy lives in `content.ts`, the layout in `html.ts`, delivery in
 * `src/lib/server/mail.ts` (an outbox in Firestore, drained with retries).
 * Code that decides an email is due only ever builds one of these.
 */

export type Money = { amountMinor: number; currency: string };

export type MailMessage =
  /** The account exists; the workspace does not yet. */
  | { kind: "welcome" }
  /** First payment landed and the queue is building the workspace. */
  | { kind: "workspace_building"; username: string | null; creditUsd: number }
  /** The VPS stamped the workspace: it is reachable now. */
  | { kind: "workspace_ready"; username: string; address: string }
  /** A workspace that exists is paid for again (resubscribed, or a failing mandate fixed). */
  | { kind: "subscription_resumed"; username: string; address: string | null }
  /** A renewal charge was collected. `charge` is null for subscriptions made before bills were locked. */
  | { kind: "renewal_charged"; username: string | null; charge: Money | null; creditUsd: number; periodEnd: string | null }
  /** Razorpay could not collect; the grace clock is running. */
  | { kind: "payment_failed"; username: string | null; graceDays: number }
  /** The person cancelled; it runs to the end of the paid period. */
  | { kind: "cancellation_confirmed"; username: string | null; endsAt: string | null }
  /** The paid period is over; the workspace is about to pause. */
  | { kind: "subscription_ended"; username: string | null }
  /** A one-time credit pack landed on the balance. */
  | { kind: "credit_pack_added"; creditUsd: number; paid: Money }
  /**
   * A credit pack's money went back: automatically because it could not be
   * applied (`no-workspace`, `no-account`), or as a refund an admin issued.
   */
  | { kind: "credit_pack_refunded"; creditUsd: number; refunded: Money; why: "no-workspace" | "no-account" | "refund" }
  /** The separate monthly AI-credit subscription (older accounts) charged. */
  | { kind: "monthly_credit_added"; creditUsd: number }
  /** A promo code started a free month; the workspace is being built. */
  | { kind: "promo_started"; username: string; endsAt: string; creditUsd: number }
  /** The lifecycle sweep paused the workspace. */
  | { kind: "workspace_paused"; username: string; cause: "payment" | "trial"; promo: boolean; removeAfter: string | null }
  /** Still unpaid; removal is days away. */
  | { kind: "removal_reminder"; username: string; removeAfter: string; daysLeft: number }
  /** The VPS removed it. */
  | { kind: "workspace_removed"; username: string }
  /** A paused workspace is running again. */
  | { kind: "workspace_resumed"; username: string; address: string | null }
  /** For admins: what needs a person's look since the last digest. */
  | { kind: "admin_digest"; items: DigestItem[] };

export type DigestItem = {
  /** ISO 8601, when it happened (null when unknown). */
  at: string | null;
  /** Short label: "Webhook missed", "Provisioning failed", … */
  what: string;
  /** Who it concerns — an email, username or uid — when known. */
  who: string | null;
  detail: string;
};

export type MailKind = MailMessage["kind"];

export type OutboxStatus = "queued" | "sending" | "sent" | "failed" | "expired";

/** A row in `mail_outbox`. One per event (see `mailKey`); the drain delivers it. */
export type OutboxEntry = {
  to: string;
  /** For the greeting; "" when unknown. */
  name: string;
  /** The account it concerns; null for admin mail. */
  uid: string | null;
  /** Two-letter country, for dates in the person's day (India reads IST). */
  country: string | null;
  message: MailMessage;
  status: OutboxStatus;
  attempts: number;
  /** ISO 8601 — not before this (backoff after a failed attempt). */
  retryAt: string | null;
  lastError: string | null;
  /** ISO 8601. */
  queuedAt: string;
  sentAt: string | null;
  messageId: string | null;
};
