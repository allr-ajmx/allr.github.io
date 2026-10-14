import "server-only";

import { createHash } from "node:crypto";
import nodemailer from "nodemailer";
import { after } from "next/server";
import { adminDb } from "./admin";
import { adminEmails } from "./admin-gate";
import { shipLog } from "./logship";
import { ETYMOLOGY } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site";
import { digestItems, type FailedOp, type FailedQueueEntry, type FlaggedEvent } from "@/lib/mail/alerts";
import { render } from "@/lib/mail/content";
import { greetingFor, toHtml, toText, type Chrome } from "@/lib/mail/html";
import { availableOf, creditAlert, creditAlertsFromDoc } from "@/lib/mail/credit-alerts";
import { claimDecision, mailKey, nextMailAttempt } from "@/lib/mail/outbox";
import type { MailMessage, OutboxEntry } from "@/lib/mail/types";

/**
 * Email, the server half: an outbox in Firestore and a drain that sends it.
 *
 * Nothing sends inline. Code that decides an email is due writes a row to
 * `mail_outbox` in the SAME transaction as the state change it describes, so
 * "payment recorded" and "payment email queued" cannot come apart, and a
 * redelivered webhook writes the same row again (keyed by event — see
 * `mailKey`) rather than a second email. The drain claims rows atomically,
 * sends over Hostinger SMTP, and retries with backoff; it runs right after
 * the request (`after()`) and from the VPS worker's clock as the safety net.
 *
 * Unset SMTP env = disabled: rows still queue (and expire after three days
 * unsent), nothing is attempted, and no request ever waits on mail.
 */

const OUTBOX = "mail_outbox";
const BATCH = 50;

export type MailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  replyTo: string | null;
  /** Named in the footer as the address a person reads. */
  supportEmail: string | null;
};

export function mailConfig(): MailConfig | null {
  const user = process.env.ALLR_SMTP_USER?.trim();
  const pass = process.env.ALLR_SMTP_PASS;
  if (!user || !pass) return null;
  const port = Number(process.env.ALLR_SMTP_PORT || 465);
  const replyTo = process.env.ALLR_MAIL_REPLY_TO?.trim() || null;
  return {
    host: process.env.ALLR_SMTP_HOST?.trim() || "smtp.hostinger.com",
    port: Number.isFinite(port) && port > 0 ? port : 465,
    user,
    pass,
    from: process.env.ALLR_MAIL_FROM?.trim() || `Allr <${user}>`,
    replyTo,
    supportEmail: process.env.ALLR_MAIL_SUPPORT?.trim() || replyTo,
  };
}

export const mailConfigured = (): boolean => mailConfig() !== null;

/** A Firestore transaction or batch: whatever the caller is already writing with. */
type Writer = {
  set(
    ref: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData,
    options: FirebaseFirestore.SetOptions,
  ): unknown;
};

export type EnqueueInput = {
  /** The account it concerns; null for admin mail. */
  uid: string | null;
  to: string;
  name?: string | null;
  country?: string | null;
  message: MailMessage;
  /** What makes this occurrence distinct: a subscription id, a payment id, a paid_count. */
  ref?: string;
};

/**
 * Queue one email inside the caller's transaction or batch. The same key a
 * second time is the same row: `status` goes back to queued, `sentAt` (if it
 * was sent) stays, and the drain sees that and sends nothing.
 */
export function enqueueMail(w: Writer, input: EnqueueInput, now = new Date()): string | null {
  const to = (input.to ?? "").trim().toLowerCase();
  if (!to.includes("@")) {
    console.warn(`[mail] no address for ${input.message.kind} (${input.uid ?? "admin"}): not queued`);
    return null;
  }
  const key = mailKey(input.message.kind, input.uid, input.ref);
  const at = now.toISOString();
  const row: Partial<OutboxEntry> & { updatedAt: string } = {
    to,
    name: (input.name ?? "").trim(),
    uid: input.uid,
    country: input.country?.trim().toUpperCase() || null,
    message: input.message,
    status: "queued",
    queuedAt: at,
    updatedAt: at,
  };
  w.set(adminDb().collection(OUTBOX).doc(key), row, { merge: true });
  return key;
}

/** Queue outside any transaction: a batch of one. */
export async function enqueueMailNow(input: EnqueueInput): Promise<string | null> {
  const batch = adminDb().batch();
  const key = enqueueMail(batch, input);
  if (key) await batch.commit();
  return key;
}

export type Outgoing = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

/** Delivers one message. Tests pass their own; production uses SMTP. */
export type Sender = (mail: Outgoing) => Promise<{ messageId: string | null }>;

function smtpSender(cfg: MailConfig): { send: Sender; close: () => void } {
  // A connection per message, not a pool: this runs in a serverless function
  // that may be frozen the moment the response is out.
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return {
    send: async (m) => {
      const info = await transport.sendMail(m);
      return { messageId: info.messageId ?? null };
    },
    close: () => transport.close(),
  };
}

export type DrainSummary = {
  /** SMTP env unset: nothing was attempted. */
  disabled: boolean;
  sent: number;
  /** Failed this time; will be tried again. */
  retried: number;
  /** Gave up after MAIL_MAX_ATTEMPTS; a person should look. */
  failed: number;
  expired: number;
  skipped: number;
  errors: string[];
};

function chromeFor(cfg: MailConfig | null, entry: Pick<OutboxEntry, "to" | "name" | "message">): Chrome {
  const siteUrl = getSiteUrl();
  return {
    logoUrl: `${siteUrl}/logo-mark.png`,
    siteUrl,
    to: entry.to,
    greeting: entry.message.kind === "admin_digest" ? null : greetingFor(entry.name),
    // The locked brand line (DESIGN.md §3): imported here, not in the pure
    // copy module, because brand.ts resolves only through the bundler.
    footerLine: ETYMOLOGY,
    supportEmail: cfg?.supportEmail ?? null,
  };
}

/**
 * AI credit low or gone, decided from live usage inside the caller's
 * transaction: queues the email and records, on `users.creditAlerts`, that
 * this balance has been told — so each alert goes once until credit is
 * added. Returns whether an email was queued.
 */
export function queueCreditAlert(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
  ledger: { purchasedUsd: number; usageUsd: number },
  now = new Date(),
): boolean {
  const prior = creditAlertsFromDoc(data.creditAlerts);
  const { send, next } = creditAlert(ledger, prior, now);
  if (JSON.stringify(next) !== JSON.stringify(prior)) tx.update(ref, { creditAlerts: next });
  if (!send || !next) return false;
  const username = String(data.workspace_username ?? "").trim() || null;
  enqueueMail(
    tx,
    {
      uid: ref.id,
      to: String(data.email ?? ""),
      name: data.name,
      country: data.country,
      message: send === "out" ? { kind: "credit_out", username } : { kind: "credit_low", username, availableUsd: availableOf(ledger) },
      // Once per balance: the key carries the purchased total it fired at.
      ref: String(Math.round(next.basisUsd * 100)),
    },
    now,
  );
  return true;
}

/** Render a queued row exactly as the drain would send it. */
export function renderEntry(entry: Pick<OutboxEntry, "to" | "name" | "country" | "message">, cfg = mailConfig()) {
  const content = render(entry.message, {
    siteUrl: getSiteUrl(),
    name: entry.name,
    country: entry.country,
    supportEmail: cfg?.supportEmail ?? null,
  });
  const chrome = chromeFor(cfg, entry);
  return { subject: content.subject, html: toHtml(content, chrome), text: toText(content, chrome) };
}

/**
 * Send what is due. Safe to run from two places at once: each row is claimed
 * in a transaction before it is sent, and a claim left by a function that
 * died mid-send is taken over after CLAIM_STALE_MS.
 */
export async function drainOutbox(
  opts: { send?: Sender; now?: Date; limit?: number } = {},
): Promise<DrainSummary> {
  const now = opts.now ?? new Date();
  const at = now.toISOString();
  const summary: DrainSummary = { disabled: false, sent: 0, retried: 0, failed: 0, expired: 0, skipped: 0, errors: [] };
  const cfg = mailConfig();
  let send = opts.send;
  let close = () => {};
  if (!send) {
    if (!cfg) return { ...summary, disabled: true };
    ({ send, close } = smtpSender(cfg));
  }

  const db = adminDb();
  const [queued, sending] = await Promise.all([
    db.collection(OUTBOX).where("status", "==", "queued").limit(opts.limit ?? BATCH).get(),
    db.collection(OUTBOX).where("status", "==", "sending").limit(20).get(),
  ]);

  try {
    for (const doc of [...queued.docs, ...sending.docs]) {
      const claimed = await db.runTransaction(async (tx) => {
        const d = (await tx.get(doc.ref)).data();
        if (!d) return { verdict: "skip" as const, entry: null };
        const verdict = claimDecision(d, now.getTime());
        if (verdict === "already-sent") tx.update(doc.ref, { status: "sent", updatedAt: at });
        else if (verdict === "expired") tx.update(doc.ref, { status: "expired", updatedAt: at });
        else if (verdict === "send") tx.update(doc.ref, { status: "sending", claimedAt: at, updatedAt: at });
        return { verdict, entry: verdict === "send" ? (d as OutboxEntry) : null };
      });
      if (claimed.verdict === "expired") summary.expired++;
      if (claimed.verdict !== "send" || !claimed.entry) {
        if (claimed.verdict !== "expired") summary.skipped++;
        continue;
      }

      const entry = claimed.entry;
      try {
        const rendered = renderEntry(entry, cfg);
        const { messageId } = await send({
          to: entry.to,
          from: cfg?.from ?? "Allr <no-reply@allr.work>",
          ...(cfg?.replyTo ? { replyTo: cfg.replyTo } : {}),
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
          headers: { "X-Allr-Mail": doc.id },
        });
        await doc.ref.update({ status: "sent", sentAt: at, messageId, lastError: null, updatedAt: at });
        summary.sent++;
      } catch (e) {
        const retry = nextMailAttempt(Number(entry.attempts ?? 0), now.getTime());
        const lastError = String((e as Error)?.message ?? e).slice(0, 500);
        await doc.ref.update({ ...retry, lastError, updatedAt: at });
        if (retry.status === "failed") summary.failed++;
        else summary.retried++;
        summary.errors.push(`${doc.id}: ${lastError}`);
        console.error(`[mail] ${doc.id} (${entry.message.kind}) attempt ${retry.attempts} failed: ${lastError}`);
        shipLog(
          "mail",
          retry.status === "failed" ? "email given up" : "email send failed, will retry",
          { key: doc.id, kind: entry.message.kind, uid: entry.uid, attempts: retry.attempts, error: lastError },
          retry.status === "failed" ? "error" : "warn",
        );
      }
    }
  } finally {
    close();
  }
  if (summary.sent) shipLog("mail", "emails sent", { sent: summary.sent, retried: summary.retried, failed: summary.failed });
  return summary;
}

/** Who gets the admin digest: ALLR_ADMIN_ALERT_EMAILS, else the admin-UI allowlist. */
export function alertRecipients(): string[] {
  const explicit = (process.env.ALLR_ADMIN_ALERT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  return explicit.length ? explicit : [...adminEmails()];
}

export type AlertSummary = { items: number; recipients: number; enqueued: boolean };

/**
 * What needs a person's look, as one digest per admin: unresolved flagged
 * billing events, builds and ops that gave up. Each source row is stamped
 * `alertedAt` in the same batch as the digest is queued, so it is told once.
 */
export async function alertAdmins(now = new Date()): Promise<AlertSummary> {
  const recipients = alertRecipients();
  if (!recipients.length) return { items: 0, recipients: 0, enqueued: false };
  const db = adminDb();
  const [flags, builds, ops] = await Promise.all([
    db.collection("billing_events").where("resolved", "==", false).limit(200).get(),
    db.collection("provision_queue").where("status", "==", "failed").limit(50).get(),
    db.collection("workspace_ops").where("status", "==", "failed").limit(50).get(),
  ]);
  const fresh = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => docs.filter((d) => !d.data().alertedAt);
  const f = fresh(flags.docs).filter((d) => d.data().flag === true);
  const b = fresh(builds.docs);
  const o = fresh(ops.docs);
  if (!f.length && !b.length && !o.length) return { items: 0, recipients: recipients.length, enqueued: false };

  const items = digestItems(
    f.map((d) => ({ id: d.id, ...d.data() }) as FlaggedEvent),
    b.map((d) => ({ id: d.id, ...d.data() }) as FailedQueueEntry),
    o.map((d) => ({ id: d.id, ...d.data() }) as FailedOp),
  );
  const ref = createHash("sha256")
    .update([...f, ...b, ...o].map((d) => d.ref.path).sort().join("\n"))
    .digest("hex")
    .slice(0, 16);
  const batch = db.batch();
  for (const to of recipients) {
    enqueueMail(batch, { uid: null, to, name: "", country: "IN", message: { kind: "admin_digest", items }, ref: `${ref}:${to}` }, now);
  }
  for (const d of [...f, ...b, ...o]) batch.update(d.ref, { alertedAt: now.toISOString() });
  await batch.commit();
  return { items: items.length, recipients: recipients.length, enqueued: true };
}

/** One tick: queue any admin digest, then send everything due. */
export async function processMail(now = new Date()): Promise<DrainSummary & { alerts: AlertSummary }> {
  let alerts: AlertSummary = { items: 0, recipients: 0, enqueued: false };
  try {
    alerts = await alertAdmins(now);
  } catch (e) {
    console.error("[mail] admin digest failed", e);
  }
  const drain = await drainOutbox({ now });
  return { ...drain, alerts };
}

/**
 * Send what was just queued, after the response is out. Never throws, never
 * awaited by the caller; the VPS tick catches anything this misses.
 */
export function kickMail(): void {
  if (!mailConfigured()) return;
  const run = () => processMail().catch((e) => console.error("[mail] background drain failed", e));
  try {
    after(run);
  } catch {
    // Outside a request (a script, a test): run it now, in the background.
    void run();
  }
}
