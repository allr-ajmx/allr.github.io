/**
 * The words of every email, pure. A message (types.ts) becomes a `Content`:
 * subject, heading, short paragraphs, one button, an optional table — and
 * html.ts renders that twice, as HTML and as plain text, so the two can
 * never say different things.
 *
 * Voice (DESIGN.md §3): mentor, not vendor. Short sentences. Second person.
 * Concrete nouns. Nothing here invents a price or a day count — those arrive
 * in the message from the billing constants.
 */

import { formatMoney } from "../billing/history.ts";
import type { MailMessage, Money } from "./types.ts";

export type Content = {
  subject: string;
  /** The inbox preview line (hidden in the body); also the first text line. */
  preview: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  /** Label/value lines: a bill, a digest. */
  rows?: { label: string; value: string }[];
  /** Quieter, after the button. */
  note?: string;
};

export type RenderContext = {
  /** https://www.allr.work — links are absolute. */
  siteUrl: string;
  /** Account holder's name; "" when unknown. */
  name: string;
  /** Two-letter country; India reads dates in IST. */
  country: string | null;
  /** An address a person reads, for "if this wasn't you" lines. */
  supportEmail?: string | null;
};

/** "14 October 2026", in the person's day. */
export function formatDay(iso: string | null | undefined, country: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: country?.toUpperCase() === "IN" ? "Asia/Kolkata" : "UTC",
  });
}

/** "₹1,548" / "$10". */
export const money = (m: Money) => formatMoney(m.amountMinor, m.currency);

/** "$20" / "$7.50". */
export const usd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** "kamal.allr.work", or "your workspace" when the name isn't known yet. */
const site = (username: string | null | undefined) => (username ? `${username}.allr.work` : "your workspace");

export function render(m: MailMessage, ctx: RenderContext): Content {
  const billing = `${ctx.siteUrl}/account/billing/`;
  const credits = `${ctx.siteUrl}/account/credits/`;
  const day = (iso: string | null | undefined) => formatDay(iso, ctx.country);

  switch (m.kind) {
    case "welcome":
      return {
        subject: "Welcome to Allr",
        preview: "Your account is ready. Next: name your workspace.",
        heading: "Your account is ready.",
        paragraphs: [
          "Next, name your workspace and subscribe. It is built the moment your first payment lands — usually within a few minutes.",
          "Have a promo code? Enter it when you choose a name.",
        ],
        cta: { label: "Name your workspace", href: billing },
        note: "The Allr app is free and stays free. The workspace is the plan.",
      };

    case "workspace_building":
      return {
        subject: "Payment received — your workspace is on its way",
        preview: `${site(m.username)} is being built now.`,
        heading: "Payment received.",
        paragraphs: [
          `Thanks. ${site(m.username)} is being built now — usually a few minutes. We'll email you the moment it's live.`,
          ...(m.creditUsd > 0
            ? [`Your plan adds ${usd(m.creditUsd)} of AI credit each month. The first ${usd(m.creditUsd)} is already on your account; unused credit stays.`]
            : []),
        ],
        cta: { label: "See progress", href: billing },
      };

    case "workspace_ready":
      return {
        subject: `${m.username}.allr.work is live`,
        preview: "Open it and sign in with this email address.",
        heading: "Your workspace is live.",
        paragraphs: [
          `Open ${m.username}.allr.work and sign in with this email address. Everything you make there stays there.`,
        ],
        cta: { label: "Open workspace", href: m.address },
        note: "Your plan and AI credit are on your account page.",
      };

    case "subscription_resumed":
      return {
        subject: "Your subscription is active again",
        preview: `${site(m.username)} keeps running.`,
        heading: "You're back on a paid plan.",
        paragraphs: [
          `Payment received. ${site(m.username)} keeps running — and if it was paused, it is being started again, usually within a few minutes.`,
        ],
        cta: m.address ? { label: "Open workspace", href: m.address } : { label: "Your account", href: billing },
      };

    case "renewal_charged": {
      const until = day(m.periodEnd);
      return {
        subject: m.charge ? `Payment received: ${money(m.charge)}` : "Payment received",
        preview: `${site(m.username)} is paid up${until ? ` until ${until}` : ""}.`,
        heading: "Payment received.",
        paragraphs: [
          `${site(m.username).replace(/^your/, "Your")} is paid up${until ? ` until ${until}` : ""}.`,
          ...(m.creditUsd > 0 ? [`${usd(m.creditUsd)} of AI credit has been added. Unused credit stays.`] : []),
        ],
        rows: [
          ...(m.charge ? [{ label: "Charged", value: money(m.charge) }] : []),
          ...(until ? [{ label: "Next renewal", value: until }] : []),
        ],
        cta: { label: "Receipts and history", href: billing },
      };
    }

    case "payment_failed":
      return {
        subject: "Your payment didn't go through",
        preview: `${site(m.username)} stays up for ${m.graceDays} days while Razorpay retries.`,
        heading: "Your payment didn't go through.",
        paragraphs: [
          `Razorpay couldn't collect this month's payment. ${site(m.username).replace(/^your/, "Your")} stays up for ${m.graceDays} days while it retries. If it still can't be collected, the workspace is paused — your data stays.`,
          "Check the card or UPI mandate, or pay now from your account.",
        ],
        cta: { label: "Fix payment", href: billing },
      };

    case "cancellation_confirmed": {
      const until = day(m.endsAt);
      return {
        subject: "Cancelled — no further charges",
        preview: `${site(m.username)} stays up until ${until ?? "the end of the period you paid for"}.`,
        heading: "Your subscription is cancelled.",
        paragraphs: [
          `No further charges. ${site(m.username).replace(/^your/, "Your")} stays up until ${until ?? "the end of the period you paid for"}. After that it pauses; everything in it stays, and you can subscribe again any time.`,
        ],
        cta: { label: "Your account", href: billing },
      };
    }

    case "subscription_ended":
      return {
        subject: "Your subscription has ended",
        preview: `${site(m.username)} is being paused. Nothing is deleted.`,
        heading: "Your subscription has ended.",
        paragraphs: [
          `The period you paid for is over, so ${site(m.username)} is being paused. Nothing is deleted. Subscribe again and it comes straight back, just as you left it.`,
        ],
        cta: { label: "Resubscribe", href: billing },
      };

    case "credit_pack_added":
      return {
        subject: `${usd(m.creditUsd)} of AI credit added`,
        preview: `We received ${money(m.paid)}.`,
        heading: `${usd(m.creditUsd)} of AI credit added.`,
        paragraphs: [
          `Thanks — we received ${money(m.paid)}. Your AI key's limit updates within a minute. Unused credit stays.`,
        ],
        cta: { label: "Credits", href: credits },
      };

    case "credit_pack_refunded": {
      const back = `${money(m.refunded)} is on its way back to the card or account you paid with. Refunds usually take 5–7 working days.`;
      return {
        subject: "Your credit pack has been refunded",
        preview: back,
        heading: "Your credit pack was refunded.",
        paragraphs:
          m.why === "refund"
            ? [
                `Your ${usd(m.creditUsd)} credit pack has been refunded. ${back}`,
                "Whatever of that credit was unspent has been taken off your balance.",
              ]
            : [
                `We couldn't apply your ${usd(m.creditUsd)} credit pack — ${m.why === "no-account" ? "it wasn't linked to an Allr account" : "there was no running workspace to top up"} — so ${back}`,
                "If you meant to top up a workspace, subscribe first and try again.",
              ],
        cta: { label: "Your account", href: billing },
      };
    }

    case "monthly_credit_added":
      return {
        subject: `${usd(m.creditUsd)} of monthly AI credit added`,
        preview: "Your monthly AI credit payment went through.",
        heading: `${usd(m.creditUsd)} of AI credit added.`,
        paragraphs: ["Your monthly AI credit payment went through. Unused credit stays."],
        cta: { label: "Credits", href: credits },
      };

    case "promo_started": {
      const until = day(m.endsAt) ?? "the end of the month";
      return {
        subject: "Your free month has started",
        preview: `${m.username}.allr.work is being built now.`,
        heading: "Your free month has started.",
        paragraphs: [
          `${m.username}.allr.work is being built now — we'll email you when it's live. It's free until ${until}, with ${usd(m.creditUsd)} of AI credit to start.`,
          "Subscribe any time to keep it running after the free month.",
        ],
        cta: { label: "Your account", href: billing },
      };
    }

    case "workspace_paused": {
      const removal = day(m.removeAfter);
      return {
        subject: "Your workspace is paused",
        preview: `${m.username}.allr.work is paused. Everything in it is kept.`,
        heading: "Your workspace is paused.",
        paragraphs:
          m.cause === "payment"
            ? [
                `${m.username}.allr.work has been paused because payment didn't go through. Everything in it is kept.`,
                removal
                  ? `Subscribe or fix the payment and it comes straight back. If it stays unpaid, the workspace and its data are removed on ${removal}.`
                  : "Subscribe or fix the payment and it comes straight back.",
              ]
            : [
                `Your free ${m.promo ? "month" : "week"} has ended, so ${m.username}.allr.work is paused. Everything in it is kept.`,
                "Subscribe and it comes straight back, just as you left it.",
              ],
        cta: { label: m.cause === "payment" ? "Fix payment" : "Subscribe", href: billing },
      };
    }

    case "removal_reminder": {
      const removal = day(m.removeAfter) ?? "soon";
      return {
        subject: `${m.username}.allr.work is removed in ${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"}`,
        preview: `On ${removal} it is removed, along with everything in it.`,
        heading: `${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"} left.`,
        paragraphs: [
          `${m.username}.allr.work has been paused for non-payment. On ${removal} it is removed, along with everything in it.`,
          "Subscribe or fix the payment before then and it comes straight back.",
        ],
        cta: { label: "Keep my workspace", href: billing },
      };
    }

    case "workspace_removed":
      return {
        subject: "Your workspace has been removed",
        preview: `${m.username}.allr.work and its data have been removed.`,
        heading: "Your workspace has been removed.",
        paragraphs: [
          `${m.username}.allr.work and its data have been removed, as the subscription stayed unpaid after the pause.`,
          "Your Allr account is still here. Subscribe again and a new workspace is built for you.",
        ],
        cta: { label: "Start again", href: billing },
      };

    case "workspace_resumed":
      return {
        subject: "Your workspace is back",
        preview: `${m.username}.allr.work is running again.`,
        heading: "Your workspace is back.",
        paragraphs: [`${m.username}.allr.work is running again. Open it and carry on where you left off.`],
        cta: m.address ? { label: "Open workspace", href: m.address } : { label: "Your account", href: billing },
      };

    case "email_transferred_out":
      return {
        subject: `Your Allr account has moved to ${m.newEmail}`,
        preview: "This address no longer signs in.",
        heading: "Your account has moved.",
        paragraphs: [
          `An Allr admin transferred your account — your workspace, plan and AI credit — to ${m.newEmail}. This address no longer signs in to it.`,
          `If you didn't ask for this, ${ctx.supportEmail ? `write to ${ctx.supportEmail}` : "contact Allr"} straight away.`,
        ],
        cta: { label: "allr.work", href: `${ctx.siteUrl}/` },
      };

    case "email_transferred_in":
      return {
        subject: "This address now owns your Allr account",
        preview: `Sign in with Google as this address.${m.username ? ` ${m.username}.allr.work follows.` : ""}`,
        heading: "This address now owns your account.",
        paragraphs: [
          `Your Allr account${m.username ? `, including ${m.username}.allr.work,` : ""} was moved here from ${m.oldEmail} by an Allr admin. Sign in with Google using this address.`,
          ...(m.username ? ["The workspace's own sign-in follows within a few minutes."] : []),
        ],
        cta: { label: "Sign in", href: `${ctx.siteUrl}/login/` },
      };

    case "credit_low":
      return {
        subject: `AI credit is running low: ${usd(m.availableUsd)} left`,
        preview: "When it runs out, AI in the workspace pauses until you top up.",
        heading: "Your AI credit is running low.",
        paragraphs: [
          `${site(m.username).replace(/^your/, "Your")} has ${usd(m.availableUsd)} of AI credit left. When it runs out, AI there pauses until you top up — or use your own key.`,
        ],
        cta: { label: "Top up", href: credits },
      };

    case "credit_out":
      return {
        subject: "Your AI credit is used up",
        preview: "AI in the workspace is paused until you top up.",
        heading: "Your AI credit is used up.",
        paragraphs: [
          `${site(m.username).replace(/^your/, "Your")} has no AI credit left, so AI there is paused. Top up and it carries on within a minute. Your workspace and everything in it are untouched.`,
        ],
        cta: { label: "Top up", href: credits },
      };

    case "trial_ending": {
      const until = day(m.endsAt) ?? "soon";
      const period = m.promo ? "free month" : "free week";
      return {
        subject: `Your ${period} ends on ${until}`,
        preview: `${m.username}.allr.work pauses after that unless you subscribe.`,
        heading: `${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"} of your ${period} left.`,
        paragraphs: [
          `${m.username}.allr.work is free until ${until}. Subscribe before then and it keeps running without a break.`,
          "Otherwise it pauses — nothing is deleted, and subscribing later brings it straight back.",
        ],
        cta: { label: "Subscribe", href: billing },
      };
    }

    case "provisioning_delayed":
      return {
        subject: "Your workspace is taking longer than expected",
        preview: "Your payment is safe and your name is held. No action needed.",
        heading: "Setup hit a snag.",
        paragraphs: [
          `Setting up ${m.username}.allr.work is taking longer than it should. Your payment is safe and your name is held.`,
          "We've been alerted and will finish it — no action needed from you. We'll email you the moment it's live.",
        ],
        cta: { label: "See progress", href: billing },
      };

    case "account_deleted":
      return {
        subject: "Your Allr account has been deleted",
        preview: "Profile, reserved names and sign-in are gone; payment records are kept.",
        heading: "Your account has been deleted.",
        paragraphs: [
          "Your profile, reserved workspace names and sign-in have been removed, and any subscription was cancelled.",
          "Payment records are kept for accounting, as the law requires. You're welcome back any time — sign up again and start fresh.",
        ],
        cta: { label: "allr.work", href: `${ctx.siteUrl}/` },
      };

    case "admin_digest":
      return {
        subject: `Needs attention: ${m.items.length} item${m.items.length === 1 ? "" : "s"}`,
        preview: m.items[0] ? `${m.items[0].what}${m.items[0].who ? ` · ${m.items[0].who}` : ""}` : "Nothing new.",
        heading: "Needs attention.",
        paragraphs: ["New since the last digest:"],
        rows: m.items.map((i) => ({
          label: `${i.what}${i.who ? ` · ${i.who}` : ""}${i.at ? ` · ${day(i.at) ?? ""}` : ""}`,
          value: i.detail,
        })),
        cta: { label: "Open the admin panel", href: `${ctx.siteUrl}/account/admin/` },
      };
  }
}
