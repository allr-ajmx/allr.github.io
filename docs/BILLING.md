# Billing: the workspace subscription (Razorpay)

The Allr app is free; the workspace is the plan — **$30/month**, billed
through Razorpay Subscriptions. Indian accounts (`country === "IN"`) are
billed the INR sibling plan (₹2,499/month) because Indian customers must be
charged in INR; everyone else pays USD. Settlement is always INR.

## Flow

1. `/account/billing` → **Subscribe** → `POST /api/account/billing/subscribe`
   creates a Razorpay customer + subscription (`notes.uid` carries the account)
   and returns `subscription_id` + key id.
2. Razorpay Checkout opens in the browser; the card/UPI mandate is set up there.
3. Razorpay calls `POST /api/billing/webhook` (signature-verified, idempotent
   by event id). `subscription.*` events write the `billing` block on
   `users/{uid}`. **The webhook is the only source of truth** — the browser
   callback merely polls until the webhook has landed.
4. `deriveState` puts a paying account in `subscribed`; a failing one in
   `pastDue`. Grace after `trialEnded` is `GRACE_DAYS` (2) — suspension is a
   manual act by whoever operates allr.os, for now.

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
     `subscription.cancelled`, `subscription.completed`.
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
