/**
 * Email, the pure half: every message renders to sane words in both forms,
 * nothing a person typed reaches the HTML unescaped, the outbox keys and
 * retries behave, and the admin digest reads the rows it is given.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDay, render } from "../src/lib/mail/content.ts";
import { escapeHtml, greetingFor, safeHref, toHtml, toText } from "../src/lib/mail/html.ts";
import {
  MAIL_BACKOFF_MS,
  MAIL_MAX_AGE_MS,
  MAIL_MAX_ATTEMPTS,
  claimDecision,
  isDue,
  isStale,
  mailKey,
  nextMailAttempt,
} from "../src/lib/mail/outbox.ts";
import { digestItems, labelForEvent } from "../src/lib/mail/alerts.ts";

const ctx = { siteUrl: "https://www.allr.work", name: "Kamal Rao", country: "IN" };
const chrome = {
  logoUrl: "https://www.allr.work/logo-mark.png",
  siteUrl: ctx.siteUrl,
  to: "k@example.com",
  greeting: "Hi Kamal,",
  footerLine: "allr — as in all.",
  supportEmail: null,
};
const INR = { amountMinor: 154_800, currency: "INR" };

/** One of every kind, with the facts each needs. */
const EVERY = [
  { kind: "welcome" },
  { kind: "workspace_building", username: "kamal", creditUsd: 20 },
  { kind: "workspace_building", username: null, creditUsd: 0 },
  { kind: "workspace_ready", username: "kamal", address: "https://kamal.allr.work" },
  { kind: "subscription_resumed", username: "kamal", address: "https://kamal.allr.work" },
  { kind: "renewal_charged", username: "kamal", charge: INR, creditUsd: 20, periodEnd: "2026-11-14T10:00:00Z" },
  { kind: "renewal_charged", username: null, charge: null, creditUsd: 0, periodEnd: null },
  { kind: "payment_failed", username: "kamal", graceDays: 2 },
  { kind: "cancellation_confirmed", username: "kamal", endsAt: "2026-11-14T10:00:00Z" },
  { kind: "subscription_ended", username: "kamal" },
  { kind: "credit_pack_added", creditUsd: 25, paid: { amountMinor: 2_500, currency: "USD" } },
  { kind: "credit_pack_refunded", creditUsd: 25, refunded: { amountMinor: 2_500, currency: "USD" }, why: "no-workspace" },
  { kind: "credit_pack_refunded", creditUsd: 25, refunded: { amountMinor: 2_500, currency: "USD" }, why: "no-account" },
  { kind: "credit_pack_refunded", creditUsd: 25, refunded: { amountMinor: 2_500, currency: "USD" }, why: "refund" },
  { kind: "monthly_credit_added", creditUsd: 20 },
  { kind: "promo_started", username: "kamal", endsAt: "2026-11-14T10:00:00Z", creditUsd: 5 },
  { kind: "workspace_paused", username: "kamal", cause: "payment", promo: false, removeAfter: "2026-10-28T10:00:00Z" },
  { kind: "workspace_paused", username: "kamal", cause: "trial", promo: true, removeAfter: null },
  { kind: "removal_reminder", username: "kamal", removeAfter: "2026-10-17T10:00:00Z", daysLeft: 3 },
  { kind: "removal_reminder", username: "kamal", removeAfter: "2026-10-15T10:00:00Z", daysLeft: 1 },
  { kind: "workspace_removed", username: "kamal" },
  { kind: "workspace_resumed", username: "kamal", address: null },
  {
    kind: "admin_digest",
    items: [{ at: "2026-10-14T09:00:00Z", what: "Webhook missed", who: "u1", detail: "applied from Razorpay" }],
  },
];

describe("every email renders", () => {
  for (const m of EVERY) {
    it(`${m.kind}${"why" in m ? ` (${m.why})` : ""}${"cause" in m ? ` (${m.cause})` : ""}`, () => {
      const c = render(m, ctx);
      assert.ok(c.subject.length > 4 && c.subject.length < 90, `subject: ${c.subject}`);
      assert.ok(c.heading && c.preview);
      assert.ok(c.paragraphs.filter(Boolean).length >= 1);
      assert.ok(c.cta?.href.startsWith("https://"), "every email has one button with an absolute link");
      const html = toHtml(c, chrome);
      const text = toText(c, chrome);
      for (const out of [html, text]) {
        for (const bad of ["undefined", "null", "NaN", "[object"]) assert.ok(!out.includes(bad), `${m.kind} leaks "${bad}"`);
      }
      assert.ok(html.includes(escapeHtml(c.heading)) && html.includes(c.cta.href));
      assert.ok(text.includes(c.heading) && text.includes(c.cta.href));
      assert.ok(text.includes("Hi Kamal,") && html.includes("Hi Kamal,"));
      assert.ok(html.includes(`Sent to k@example.com`));
    });
  }
});

describe("the words", () => {
  it("a renewal names the amount, the credit and the next date in the person's day", () => {
    const c = render(EVERY[5], ctx);
    assert.equal(c.subject, "Payment received: ₹1,548");
    assert.deepEqual(c.rows, [
      { label: "Charged", value: "₹1,548" },
      { label: "Next renewal", value: "14 November 2026" },
    ]);
    assert.ok(c.paragraphs.some((p) => p.includes("$20 of AI credit")));
  });

  it("dates read in IST for India and UTC elsewhere", () => {
    assert.equal(formatDay("2026-10-14T20:00:00Z", "IN"), "15 October 2026");
    assert.equal(formatDay("2026-10-14T20:00:00Z", "US"), "14 October 2026");
    assert.equal(formatDay("garbage", "IN"), null);
    assert.equal(formatDay(null, "IN"), null);
  });

  it("a payment pause names the removal date; a trial pause never threatens removal", () => {
    const paid = render(EVERY[16], ctx);
    assert.ok(paid.paragraphs.join(" ").includes("removed on 28 October 2026"));
    const trial = render(EVERY[17], ctx);
    assert.ok(!trial.paragraphs.join(" ").toLowerCase().includes("removed"));
    assert.ok(trial.paragraphs[0].includes("free month"));
  });

  it("the reminder counts days in the singular and the plural", () => {
    assert.equal(render(EVERY[18], ctx).subject, "kamal.allr.work is removed in 3 days");
    assert.equal(render(EVERY[19], ctx).subject, "kamal.allr.work is removed in 1 day");
  });

  it("a building email only mentions credit when the plan carries some", () => {
    assert.ok(render(EVERY[1], ctx).paragraphs.some((p) => p.includes("$20")));
    assert.ok(!render(EVERY[2], ctx).paragraphs.some((p) => p.includes("$")));
    assert.ok(render(EVERY[2], ctx).paragraphs[0].includes("your workspace is being built"));
  });

  it("the digest has one row per item and links to the admin panel", () => {
    const c = render(EVERY.at(-1), ctx);
    assert.equal(c.subject, "Needs attention: 1 item");
    assert.equal(c.rows.length, 1);
    assert.ok(c.rows[0].label.startsWith("Webhook missed · u1"));
    assert.equal(c.cta.href, "https://www.allr.work/account/admin/");
  });
});

describe("the layout", () => {
  it("escapes what the person typed", () => {
    const c = render({ kind: "workspace_ready", username: `x<script>alert(1)</script>`, address: "https://x.allr.work" }, ctx);
    const html = toHtml(c, chrome);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("never renders a non-http link as a button", () => {
    assert.equal(safeHref("javascript:alert(1)"), null);
    assert.equal(safeHref("https://kamal.allr.work"), "https://kamal.allr.work");
    const c = { ...render(EVERY[0], ctx), cta: { label: "x", href: "javascript:alert(1)" } };
    assert.ok(!toHtml(c, chrome).includes("javascript:"));
  });

  it("carries the preview, the logo, the wordmark and a support line when there is one", () => {
    const c = render(EVERY[0], ctx);
    const html = toHtml(c, { ...chrome, supportEmail: "hello@allr.work" });
    assert.ok(html.includes(escapeHtml(c.preview)));
    assert.ok(html.includes("logo-mark.png") && html.includes(">allr<"));
    assert.ok(html.includes("mailto:hello@allr.work"));
    assert.ok(toText(c, { ...chrome, supportEmail: "hello@allr.work" }).includes("Write to hello@allr.work"));
    assert.ok(!toHtml(c, chrome).includes("mailto:"));
  });

  it("greets by first name, or not at all", () => {
    assert.equal(greetingFor("Kamal Rao"), "Hi Kamal,");
    assert.equal(greetingFor("  "), null);
    assert.equal(greetingFor(null), null);
    const html = toHtml(render(EVERY[0], ctx), { ...chrome, greeting: null });
    assert.ok(!html.includes("Hi "));
  });
});

describe("the outbox", () => {
  it("keys one email per event and keeps keys Firestore-safe", () => {
    assert.equal(mailKey("welcome", "u1"), "welcome:u1");
    assert.equal(mailKey("renewal_charged", "u1", "sub_1:3"), "renewal_charged:u1:sub_1:3");
    assert.equal(mailKey("admin_digest", null, "abc:ops@allr.work"), "admin_digest:admin:abc:ops@allr.work");
    assert.equal(mailKey("welcome", "a/b c", "x/y"), "welcome:a_b_c:x_y");
    assert.notEqual(mailKey("renewal_charged", "u1", "sub_1:3"), mailKey("renewal_charged", "u1", "sub_1:4"));
    assert.ok(mailKey("welcome", "u".repeat(600)).length <= 400);
  });

  it("retries with growing backoff, then gives up after a day of trying", () => {
    const now = Date.parse("2026-10-14T10:00:00Z");
    assert.equal(MAIL_BACKOFF_MS.length, MAIL_MAX_ATTEMPTS);
    const first = nextMailAttempt(0, now);
    assert.deepEqual(first, { attempts: 1, status: "queued", retryAt: "2026-10-14T10:01:00.000Z" });
    const fourth = nextMailAttempt(3, now);
    assert.equal(fourth.status, "queued");
    assert.equal(Date.parse(fourth.retryAt) - now, 60 * 60_000);
    assert.deepEqual(nextMailAttempt(MAIL_MAX_ATTEMPTS - 1, now), { attempts: MAIL_MAX_ATTEMPTS, status: "failed", retryAt: null });
    assert.equal(MAIL_BACKOFF_MS.reduce((a, b) => a + b, 0), 22 * 60 * 60_000 + 21 * 60_000);
  });

  it("knows when a row is due, and when it is too old to send", () => {
    const now = Date.parse("2026-10-14T10:00:00Z");
    assert.equal(isDue(null, now), true);
    assert.equal(isDue("2026-10-14T09:59:59Z", now), true);
    assert.equal(isDue("2026-10-14T10:00:01Z", now), false);
    assert.equal(isStale(new Date(now - MAIL_MAX_AGE_MS + 1000).toISOString(), now), false);
    assert.equal(isStale(new Date(now - MAIL_MAX_AGE_MS - 1000).toISOString(), now), true);
    assert.equal(isStale(null, now), false);
  });

  it("decides what to do with a claimed row", () => {
    const now = Date.parse("2026-10-14T10:00:00Z");
    const fresh = new Date(now - 1000).toISOString();
    assert.equal(claimDecision({ status: "queued", queuedAt: fresh }, now), "send");
    assert.equal(claimDecision({ status: "queued", queuedAt: fresh, sentAt: fresh }, now), "already-sent");
    assert.equal(claimDecision({ status: "queued", queuedAt: new Date(now - 4 * 86_400_000).toISOString() }, now), "expired");
    assert.equal(claimDecision({ status: "queued", queuedAt: fresh, retryAt: new Date(now + 60_000).toISOString() }, now), "not-due");
    assert.equal(claimDecision({ status: "sending", queuedAt: fresh, claimedAt: fresh }, now), "skip");
    assert.equal(claimDecision({ status: "sending", queuedAt: fresh, claimedAt: new Date(now - 10 * 60_000).toISOString() }, now), "send");
    assert.equal(claimDecision({ status: "sent", queuedAt: fresh }, now), "skip");
    assert.equal(claimDecision({ status: "failed", queuedAt: fresh }, now), "skip");
  });
});

describe("the admin digest", () => {
  it("labels known outcomes and falls back to the event name", () => {
    assert.equal(labelForEvent({ id: "x", outcome: "applied-by-reconcile" }), "Webhook missed");
    assert.equal(labelForEvent({ id: "x", outcome: "rejected", eventName: "webhook" }), "Webhook refused");
    assert.equal(labelForEvent({ id: "x", eventName: "payment.dispute.created", outcome: "open" }), "Dispute");
    assert.equal(labelForEvent({ id: "x", eventName: "removal.billing_stopped", outcome: "cancelled sub_1" }), "Flagged: removal.billing_stopped");
  });

  it("lists flags, failed builds and failed ops, newest first, with details capped", () => {
    const items = digestItems(
      [{ id: "e1", outcome: "applied-by-reconcile", reason: "x".repeat(500), uid: "u1", receivedAt: "2026-10-14T09:00:00Z" }],
      [{ id: "u2", email: "b@example.com", username: "bob", error: "docker pull failed", updatedAt: "2026-10-14T11:00:00Z" }],
      [{ id: "u3:sync_limit", op: "sync_limit", username: "carol", error: "no such user", updatedAt: { toDate: () => new Date("2026-10-14T10:00:00Z") } }],
    );
    assert.deepEqual(items.map((i) => i.what), ["Provisioning failed", "Op failed: sync_limit", "Webhook missed"]);
    assert.equal(items[2].detail.length, 400);
    assert.equal(items[0].who, "b@example.com");
    assert.ok(items[0].detail.includes("bob — docker pull failed"));
    assert.equal(items[1].at, "2026-10-14T10:00:00.000Z");
  });
});
