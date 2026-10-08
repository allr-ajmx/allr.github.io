# Billing: workspace subscription and AI credits (Razorpay)

The Allr app is free. Two things are sold, and they are not the same subscription:

| Product | Billing | What it buys |
|---|---|---|
| Workspace | Monthly subscription, `$10` / `₹899` | The workspace. No AI allowance. The person can use their own keys. |
| Monthly AI credit | A second monthly subscription, optional | OpenRouter credit of the amount they chose (preset `$20`, any whole dollars, minimum `$1`). Unused credit rolls over. |
| AI credit top-up | One-time order | The same balance. Face value is the credit (`$10` paid → `$10` of credit). |

Indian accounts (`country === "IN"`) are billed in INR; everyone else pays USD.
A subscriber keeps the currency their subscription was made in. Credit is
denominated in USD. The INR charge for `$1` of credit is `₹89.90` (the
workspace rate: `₹899` / `$10`). Tax is added on the Razorpay payment screen
and is not taken out of the credit.

A legacy `workspace_ai` subscription already in Firestore is left on its
existing Razorpay mandate. New checkouts sell only the workspace plan.

## The billing core (how every change is applied)

- **One writer**: `syncSubscription` (`src/lib/server/subscriptions.ts`).
  Webhooks, the reconciler, checkout, cancel, removal and plan changes all
  call it with a subscription id; it fetches **Razorpay's current state** (a
  webhook payload is only the fallback when Razorpay is unreachable) and
  applies the decision of the pure core (`src/lib/billing/core.ts`) in one
  transaction. The same state applied twice changes nothing, so webhook order
  and redelivery don't matter.
- **Months are granted once per Razorpay `paid_count`**, whichever path sees
  the charge first. `billing.paidCount` is the count last granted for.
- **Records** are decoded by one decoder each (`src/lib/billing/records.ts`);
  every field is required in the type. Integration tests write strictly
  (`ALLR_FIRESTORE_STRICT=1`); production also ignores undefined values.
- **Reconciler** (`POST /api/admin/reconcile`, the VPS calls it every 5 min)
  re-reads the last 3 days of payments/refunds and every tracked subscription
  — the workspace one (`billing`) and the monthly AI-credit one
  (`creditSubscription`), including plan and amount changes in flight — and
  applies what webhooks missed, flagged in Needs attention as "webhook missed".
- **Webhook health**: every delivery that passes the signature check stamps
  `billing_health/webhook.lastVerifiedAt`. When the reconciler has to apply
  something and no webhook was verified in the last hour, its run row is
  flagged and starts "No Razorpay webhook has reached the site since …" —
  the webhook path is down, not one event. A delivery refused for its
  signature (or an unset secret) is flagged too, once an hour, as
  `webhook-rejected:<hour>`. A webhook URL without the trailing slash never
  reaches the route at all (308, which Razorpay treats as a failure): only
  the reconciler's "since …" line shows that one.
- **Checkout confirm** (`POST /api/account/billing/confirm`): Checkout's
  success handler asks the site to sync that subscription from Razorpay right
  away, so the page — and the AI-credit mandate that follows a workspace
  checkout — never waits on the webhook.

## Monthly AI credit

The credit subscription is a `$1` (or `₹89.90`) Razorpay plan with
`quantity` equal to the dollar amount, so any whole-dollar amount is one
subscription. It is stored on `users.creditSubscription`, separate from
`users.billing`.

Razorpay can't change a UPI or e-mandate subscription in place, so a new
amount is a **new credit subscription that starts at the current renewal
date** (`creditSubscription.upcoming`). The account still has one credit
subscription. The balance is not reset. Checkout for the first amount starts
immediately, after the workspace mandate is active.

`notes.kind` is `credits` on that subscription and `workspace` on the
workspace one. A credit charge adds its `amountUsd` to `credits.purchasedUsd`
once per `paid_count`. A workspace charge does not grant AI credit.

## Flow — fully self-serve

1. `/account/billing`: an account without a workspace **names it first**
   (`GET /api/account/username/?u=` checks availability; reservation ledger is
   `workspace_usernames`, one document per name ever).
2. **Subscribe** → `POST /api/account/billing/subscribe {username}` reserves
   the name and creates the Razorpay customer + subscription (`notes.uid`).
3. Razorpay Checkout takes the mandate; `POST /api/billing/webhook`
   (signature-verified, idempotent by event id) writes the `billing` block.
   **The webhook is the only source of truth.** In the same transaction, a
   paid account with no workspace goes onto `provision_queue`.
4. The **provisioner worker on the VPS** (allr.os `sitequeue.py`) polls
   `POST /api/admin/provision-queue/claim` (outbound only — the VPS listens to
   nobody), runs the ordinary create job — minted OpenRouter key, spend limit
   equal to available credit (zero when they have not bought any),
   capacity-capped by `ALLR_SELF_SERVE_MAX` — and its `site` step
   stamps the profile through `POST /api/admin/workspace/`. The verdict lands
   via `POST /api/admin/provision-queue/complete`.
5. `deriveState`: paid + no workspace = `provisioning` (the billing page shows
   "being built" and refreshes itself); paid + workspace = `subscribed`;
   failing charge = `pastDue`. Grace after `trialEnded` is `GRACE_DAYS` (2) —
   suspension stays a manual act.

Admins can still provision by hand (admin UI or `add-user.sh`) — the same
stamp closes the loop either way.

Cancel is always at cycle end (`cancel_at_cycle_end`), so nobody loses time
they paid for.

## One-time setup

1. **Dashboard** (test mode first):
   - Account & Settings → **API Keys** → generate. Never paste the secret into
     chat or code — it goes straight into env stores.
   - Account & Settings → **International payments** → enable card payments
     (required for the USD plan).
   - Settings → **Webhooks** → Add: URL
     `https://www.allr.work/api/billing/webhook/` — **with the trailing
     slash**: the site uses `trailingSlash`, so the bare path answers 308 and
     Razorpay counts every delivery as failed. A strong secret, events:
     `subscription.authenticated`, `subscription.activated`,
     `subscription.charged`, `subscription.pending`, `subscription.halted`,
     `subscription.paused`, `subscription.resumed`, `subscription.cancelled`,
     `subscription.completed`; for credit top-ups `payment.captured` and
     `payment.authorized`; `refund.processed`; and the `payment.dispute.*`
     events.
2. **Plans**: `RAZORPAY_KEY_ID=… RAZORPAY_KEY_SECRET=… node scripts/razorpay-setup.mjs`
   prints the two plan ids.
3. **Vercel env** (Production; repeat per mode):
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   the plan ids printed by `node scripts/razorpay-setup.mjs` —
   `RAZORPAY_PLAN_ID_WORKSPACE_USD`, `RAZORPAY_PLAN_ID_WORKSPACE_INR`,
   `RAZORPAY_PLAN_ID_CREDIT_USD` (`$1` unit), `RAZORPAY_PLAN_ID_CREDIT_INR`
   (`₹89.90` unit). Legacy `RAZORPAY_PLAN_ID_AI_*` plan ids are unused by new
   checkouts. Redeploy.
4. Go live: repeat 1–3 with live-mode keys/webhook/plans. Live mode has its
   **own** webhooks — the test-mode one does not carry over — so add it again
   in live mode and set `RAZORPAY_WEBHOOK_SECRET` to the live webhook's
   secret. Check with Razorpay's test delivery that
   `billing_health/webhook.lastVerifiedAt` moves.

## Test cards

Razorpay test mode: `4111 1111 1111 1111`, any future expiry, any CVV, OTP
`1234`. A test UPI autopay mandate: `success@razorpay`.

## Failure modes

- Razorpay down / slow: 15s timeout → 502 `billing-upstream`; nothing charged.
- Env unset: 503 `billing-unconfigured`; the page says billing isn't open.
- Webhook redelivery: deduped by `x-razorpay-event-id` in `billing_events`.
- Out-of-order events: an event for a different subscription than the active
  one is recorded and ignored.
- Abandoned checkout: the pending subscription is reused, never duplicated.

## Credits

Available credit is `purchasedUsd − usageUsd`. Monthly refills and top-ups
add to `purchasedUsd` and never expire. The credits page shows that available
balance, not a monthly allowance. Packs are `$10` / `$25` / `$50` / `$100`
(₹899 / ₹2,199 / ₹4,299 / ₹8,499) and each dollar of price is a dollar of
credit. The ledger (`users/{uid}.credits`, math in `src/lib/billing/credits.ts`)
is the source of truth; the workspace's OpenRouter key is a cumulative-limit
key (`limit_reset: never`) whose limit is `purchasedUsd`, and every ledger
change becomes a `sync_limit` op in `workspace_ops`, which the VPS worker
applies and acknowledges. The worker also pushes usage snapshots (~5 min) to
`/api/admin/usage`. Top-ups are one-time Razorpay Orders; the
`payment.captured` webhook re-fetches the order server-side and applies the
pack idempotently by payment id (`credit_purchases`). An older ledger with no
`purchasedUsd` is read as its previous remaining balance plus usage, so
nothing already granted disappears.

## Adopting pre-self-serve workspaces

Workspaces made by hand predate the site knowing them. One-time backfill, on
the VPS: `uv run allr-provisioner site sync` — stamps every existing
workspace onto its profile and claims its name in the ledger. Ongoing: the
worker adopts instead of re-creating when a paid signup's email already owns
a workspace, and every stamp claims the username. Pasted (non-minted)
OpenRouter keys cannot be limit-managed; `set_limit` ops for them are
recorded as skipped.

## Lifecycle enforcement

Billing truth becomes platform action automatically (`src/lib/billing/lifecycle.ts`
decides; `/api/admin/lifecycle/` sweeps hourly on the worker's request;
webhooks handle the instant cases):

- payment lands → workspace created, or **resumed** if the enforcer had
  suspended it (fast path straight from the webhook)
- `pastDue` → `GRACE_DAYS` (2) after the status flip → **suspended** (offline,
  data kept); the customer's billing page says so
- cancelled → runs to the end of the paid period, then suspended
- suspended for **payment** and still unpaid `REMOVE_AFTER_DAYS` (14) later →
  **removed** — containers and data deleted, the one destructive act
- trial that never paid → suspended after grace, **never removed automatically**
- an admin's manual suspension is invisible to the enforcer: never auto-resumed,
  never auto-removed

The sweep runs in **dry-run by default** — decisions are logged on the box
("would suspend …") but nothing acts until `ALLR_LIFECYCLE_ENFORCE=1` is set
in the VPS root `.env`. Arm it only after watching a few sweeps judge real
data correctly. Every acted decision is written to `lifecycle_events`; the admin table shows
`off: payment · deletes <date>` countdowns. Enforcement marks live on the
profile (`enforcement`) and are cleared when a resume op completes.
