# Billing: the workspace subscription (Razorpay)

The Allr app is free; the workspace is the plan. Two plans, billed monthly
through Razorpay Subscriptions (prices live in `src/lib/billing/plans.ts`):

| Plan | USD | INR | AI |
|---|---|---|---|
| Workspace | $10 | ₹899 | bring your own key (Keys page in the workspace); our key sits at $0 |
| Workspace + AI | $30 | ₹2,698 | $20 of AI credit each cycle, expiring at its end; packs available |

Indian accounts (`country === "IN"`) are billed the INR siblings; everyone
else pays USD. A subscriber keeps the currency their subscription was made in.

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
  (including plan changes in flight) and applies what webhooks missed —
  flagged in Needs attention as "webhook missed".

## Changing plan

Razorpay can't change a UPI or e-mandate subscription in place, so a change
is a **new subscription on the new plan that starts at the current renewal
date** (`billing.upcoming`). The billing date never moves.

- **Upgrade** (`POST /api/account/billing/change {plan}`): the prorated price
  difference for the rest of the cycle is charged **now**, as an upfront
  amount in the same Checkout; once Razorpay confirms the mandate
  (`authenticated`), the same share of AI credit is granted until the renewal
  date and the current subscription is told to end at renewal. At the
  renewal the new subscription charges and takes over (allowance → $20).
- **Downgrade**: nothing charged now; the AI credit already paid for lasts
  until the renewal date, when the Workspace subscription takes over
  (allowance → $0). Once set, it can't be undone until it takes effect.
- The handover gap (old ended, new not yet charged) never pauses anything.
- Abandoned or failed changes are dropped; cancelling mid-change cancels both.
- **To verify in Razorpay test mode before relying on it**: that an `addons`
  upfront amount is charged at authentication when `start_at` is in the future,
  for both card and UPI. If it isn't, upgrades need a separate one-off order.

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
   nobody), runs the ordinary create job — minted OpenRouter key, $20/month
   spend limit, capacity-capped by `ALLR_SELF_SERVE_MAX` — and its `site` step
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
     `https://www.allr.work/api/billing/webhook`, a strong secret, events:
     `subscription.activated`, `subscription.charged`, `subscription.pending`,
     `subscription.halted`, `subscription.paused`, `subscription.resumed`,
     `subscription.cancelled`, `subscription.completed`, and — for credit
   top-ups — `payment.captured`.
2. **Plans**: `RAZORPAY_KEY_ID=… RAZORPAY_KEY_SECRET=… node scripts/razorpay-setup.mjs`
   prints the two plan ids.
3. **Vercel env** (Production; repeat per mode):
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
   the plan ids printed by `node scripts/razorpay-setup.mjs` —
   `RAZORPAY_PLAN_ID_WORKSPACE_USD`, `RAZORPAY_PLAN_ID_WORKSPACE_INR`,
   `RAZORPAY_PLAN_ID_AI_USD` (or the older `RAZORPAY_PLAN_ID_USD`),
   `RAZORPAY_PLAN_ID_AI_INR` (or `RAZORPAY_PLAN_ID_INR`). Redeploy.
4. Go live: repeat 1–3 with live-mode keys/webhook/plans.

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

$20 of AI credit is included per subscription month (expires with the month);
purchased packs — $10 / $25 / $50 / $100 (₹899 / ₹2,199 / ₹4,299 / ₹8,499) —
carry until used. A pack's credit is its price less `PACK_FEE_SHARE` (8%,
OpenRouter funding + Razorpay fees): $9.20 / $23 / $46 / $92.
The ledger (`users/{uid}.credits`, math in `src/lib/billing/credits.ts`) is
the source of truth; the workspace's OpenRouter key is a cumulative-limit key
(`limit_reset: never`) and every ledger change becomes a `set_limit` op in
`workspace_ops`, which the VPS worker applies and acknowledges. The worker
also pushes usage snapshots (~5 min) to `/api/admin/usage`, which is what the
meter on /account/credits renders. Top-ups are one-time Razorpay Orders; the
`payment.captured` webhook re-fetches the order server-side and applies the
pack idempotently by payment id (`credit_purchases`).

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
