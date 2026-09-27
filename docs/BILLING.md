# Billing: the workspace subscription (Razorpay)

The Allr app is free; the workspace is the plan — **$30/month**, billed
through Razorpay Subscriptions. Indian accounts (`country === "IN"`) are
billed the INR sibling plan (₹2,499/month) because Indian customers must be
charged in INR; everyone else pays USD. Settlement is always INR.

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
   `RAZORPAY_PLAN_ID_USD`, `RAZORPAY_PLAN_ID_INR`. Redeploy.
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
purchased packs — $10 / $25 / $50 (₹899 / ₹2,199 / ₹4,299) — carry until used.
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
