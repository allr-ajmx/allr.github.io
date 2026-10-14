# Email: what the site sends, and how

Transactional email only — things that happened to the person's account. No
marketing, no digests to customers, no unsubscribe needed. Sent through the
company's Hostinger mailbox over SMTP, from `no-reply@allr.work`.

## What is sent

| When | Email | Where it is decided |
|---|---|---|
| Account created | **Welcome** — name your workspace | `createProfile` (`src/lib/server/profiles.ts`) |
| Promo code redeemed | **Your free month has started** | `redeemPromo` (`src/lib/server/promo.ts`) |
| First payment, no workspace yet | **Payment received — your workspace is on its way** | `syncSubscription` (`src/lib/server/subscriptions.ts`) |
| VPS stamps the workspace | **{name}.allr.work is live** | `stampWorkspace` (`src/lib/server/workspace-admin.ts`) |
| A workspace that exists is paid for again | **Your subscription is active again** | `syncSubscription` |
| Renewal collected | **Payment received: ₹1,548** (the locked bill, next date, credit added) | `syncSubscription`, keyed by `paid_count` |
| Charge failed (`pastDue`) | **Your payment didn't go through** (grace days) | `syncSubscription` |
| Person cancels | **Cancelled — no further charges** (keeps until date) | `syncSubscription` (intent `cancelAtPeriodEnd`) |
| Razorpay ends it (period over) | **Your subscription has ended** | `syncSubscription` |
| Credit pack applied | **$10 of AI credit added** | `applyTopupPayment` (`src/lib/server/credits.ts`) |
| Credit pack auto-refunded / refunded by an admin | **Your credit pack has been refunded** | `applyTopupPayment` / `applyRefund` |
| Legacy monthly credit subscription charged | **$20 of monthly AI credit added** | `syncCreditSubscription` |
| Enforcer pauses (payment or trial) | **Your workspace is paused** (removal date for payment) | `POST /api/admin/lifecycle`, armed only |
| 3 days before removal, still unpaid | **{name}.allr.work is removed in 3 days** — once | lifecycle, armed only (`enforcement.removalReminderAt`) |
| VPS removed it | **Your workspace has been removed** | `afterRemoval` (`src/lib/server/provisioning.ts`) |
| Enforcer's pause lifted | **Your workspace is back** | `completeOp` (resume) |
| Admin transfers the account to another address | **Your Allr account has moved to …** (to the old address) and **This address now owns your Allr account** (to the new) | `applyAdminAction` (`src/lib/server/admin-actions.ts`) |
| AI credit down to 15% (never under $1), something spent | **AI credit is running low: $1.80 left** — once per balance | `ingestUsage` / `resolveLimit`, via `queueCreditAlert` (`users.creditAlerts`) |
| AI credit at zero | **Your AI credit is used up** — once per balance; a top-up or monthly charge re-arms both | same |
| Free month / free week ends in ≤ 3 days, nothing paid | **Your free month ends on …** — once, armed or not | lifecycle sweep (`trial.endingReminderAt`) |
| Build failed its last retry | **Your workspace is taking longer than expected** — once per build | `completeClaim` (`src/lib/server/provisioning.ts`) |
| Admin deletes the account | **Your Allr account has been deleted** (to the deleted address) | `deleteAccount` |
| New flags / failed builds / failed ops | **Needs attention: N items** → admins | `alertAdmins` (`src/lib/server/mail.ts`) |

A dry-run lifecycle sweep (the default until `ALLR_LIFECYCLE_ENFORCE=1` on
the VPS) sends nothing about pauses or removals: a rehearsal must not
announce a pause it did not do. The free-period reminder is the exception —
the end date is a fact, not an enforcement — so it goes out either way.

Credit alerts are decided from live usage, inside the same transaction that
records it (`ingestUsage` now writes only the two usage fields, under a
transaction, so it can never overwrite a top-up or charge that landed
meanwhile). `users.creditAlerts` remembers the purchased total each alert
fired at; credit added since re-arms both. A removal clears it.

Not sent, on purpose: "name reserved" (it arrives seconds before the payment
email), anything for an admin's manual suspend/resume (no `enforcement` mark,
so nothing fires), and anything for a test-mode leftover subscription.

## How it works

- **Words live in one place.** `src/lib/mail/content.ts` turns a message
  (`src/lib/mail/types.ts`) into subject, heading, paragraphs, one button and
  optional rows; `html.ts` renders that as HTML and as plain text from the
  same structure, so the two cannot disagree. Palette and faces follow
  DESIGN.md in the forms email can carry (inline styles, tables, system
  fallbacks for Young Serif / Nunito Sans). Everything a person typed is
  escaped; only `https://` links become buttons.
- **An outbox, written in the same transaction.** Code that decides an email
  is due calls `enqueueMail(tx, …)`; the row in `mail_outbox` commits with
  the state change it describes, so "payment recorded" and "payment email
  queued" cannot come apart. Nothing sends inline and no request waits on SMTP.
- **One email per event.** Rows are keyed `kind:uid:ref` (`mailKey`) — the
  subscription id, the payment id, the `paid_count`. A redelivered webhook,
  the reconciler and checkout's confirm agreeing on the same state write the
  same row; a row that was already sent keeps its `sentAt`, and the drain
  sees that and sends nothing.
- **The drain** (`drainOutbox`) claims each row in a transaction (two drains
  can overlap), sends over SMTP, and on failure backs off: 1 min, 5, 15, 1 h,
  3 h, 6 h, 12 h, then `failed` after 8 attempts (a person should look — it
  shows in the admin digest's source list only via logs today). A claim
  older than 5 minutes belongs to a function that died mid-send and is taken
  over. A row older than 3 days is `expired`, never sent: stale news confuses.
- **When it runs.** Right after each request that queued mail, through
  Next's `after()` (the response is already out). And every minute from the
  VPS worker (`sitequeue.py`, `POST /api/admin/mail/drain`), which is the
  safety net: a frozen function, SMTP down for an hour.
- **Admin digest.** Each drain first looks for unresolved flagged
  `billing_events`, `provision_queue` entries and `workspace_ops` in status
  `failed` that have no `alertedAt`, queues one digest per admin, and stamps
  them in the same batch — so each item is told once. Resolving a flag in the
  admin panel is what stops it recurring; the digest is a nudge, the panel is
  the record.
- **Unset env = disabled.** With no SMTP user/password the drain returns
  `{disabled: true}`, rows still queue (and expire), and the VPS logs nothing.

## Setup

1. **Mailbox.** In Hostinger → Emails, make sure `no-reply@allr.work` exists
   and note its password (never in chat, never in the repo).
2. **DNS.** Already right for allr.work: MX → Hostinger, SPF
   `include:_spf.mail.hostinger.com`, DKIM selectors `hostingermail-a/b/c`,
   DMARC `p=none`. Mail sent through Hostinger's SMTP from Vercel is signed
   and aligned. Later, tighten DMARC to `p=quarantine` once reports look clean.
3. **Vercel env** (Production and Preview), then redeploy:

   | Variable | Value |
   |---|---|
   | `ALLR_SMTP_USER` | `no-reply@allr.work` |
   | `ALLR_SMTP_PASS` | the mailbox password |
   | `ALLR_SMTP_HOST` | optional; default `smtp.hostinger.com` |
   | `ALLR_SMTP_PORT` | optional; default `465` (SSL). `587` also works (STARTTLS) |
   | `ALLR_MAIL_FROM` | optional; default `Allr <no-reply@allr.work>` |
   | `ALLR_MAIL_REPLY_TO` | optional; a monitored address, e.g. `hello@allr.work` |
   | `ALLR_MAIL_SUPPORT` | optional; named in the footer ("Questions? Write to …"); defaults to the reply-to |
   | `ALLR_ADMIN_ALERT_EMAILS` | optional, comma-separated; defaults to `ALLR_ADMIN_UI_EMAILS` |

4. **VPS.** Pull `allr.os` and restart the provisioner; the worker starts
   calling `/api/admin/mail/drain/` every minute. Nothing else to configure.
5. **Check.** Sign up a test account: the welcome row appears in
   `mail_outbox` with `status: sent` and a `messageId`, and the email lands.
   A row stuck at `queued` with `lastError` set names the SMTP problem.

Hostinger's sending limits are far above transactional volume; if a mailbox
is ever rate-limited the drain's backoff absorbs it.

## Reading the outbox

`mail_outbox/{kind:uid:ref}` — `status` (`queued` / `sending` / `sent` /
`failed` / `expired`), `attempts`, `retryAt`, `lastError`, `sentAt`,
`messageId`, and the `message` that was rendered. To resend one by hand, set
`status: "queued"` and clear `sentAt`; the next drain sends it.

## Tests

- `tests/mail.test.mjs` — every kind renders in both forms with no leaked
  `undefined`, escaping, dates in the person's day, keys, backoff, expiry,
  claim decisions, the digest builder.
- `tests/integration/mail.test.ts` — the real flows against the emulator and
  the fake Razorpay: one row per event through redelivery, the drain with a
  recording sender (sent once, never twice), backoff and give-up, expiry,
  stale-claim takeover, the lifecycle pause and reminder (armed only), the
  admin digest stamping its sources.
- `allr.os/provisioner/tests/test_sitequeue.py` — the worker drains every
  minute and reports what the site said.
