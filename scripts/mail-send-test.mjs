/**
 * Send one real email through the SMTP settings the site will use, to prove
 * the mailbox and its password work BEFORE they go into Vercel.
 *
 *   ALLR_SMTP_USER=support@allr.work ALLR_SMTP_PASS=… node scripts/mail-send-test.mjs you@example.com
 *
 * Optional, same names as production: ALLR_SMTP_HOST (smtp.hostinger.com),
 * ALLR_SMTP_PORT (465; 587 is STARTTLS), ALLR_MAIL_FROM, ALLR_MAIL_REPLY_TO.
 * Renders the real "welcome" email through the templates production uses and
 * prints the SMTP server's answer. Nothing is written anywhere. Never put the
 * password on the command line in a shared shell history; export it first.
 */
import nodemailer from "nodemailer";
import { quietTypeWarnings } from "./lib/razorpay-cli.mjs";

quietTypeWarnings();
const { render } = await import("../src/lib/mail/content.ts");
const { greetingFor, toHtml, toText } = await import("../src/lib/mail/html.ts");

const to = process.argv[2];
const user = process.env.ALLR_SMTP_USER?.trim();
const pass = process.env.ALLR_SMTP_PASS;
if (!to || !to.includes("@") || !user || !pass) {
  console.error("usage: ALLR_SMTP_USER=… ALLR_SMTP_PASS=… node scripts/mail-send-test.mjs you@example.com");
  process.exit(1);
}
const host = process.env.ALLR_SMTP_HOST?.trim() || "smtp.hostinger.com";
const port = Number(process.env.ALLR_SMTP_PORT || 465);
const from = process.env.ALLR_MAIL_FROM?.trim() || `Allr <${user}>`;
const replyTo = process.env.ALLR_MAIL_REPLY_TO?.trim() || undefined;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.allr.work").replace(/\/$/, "");

const content = render({ kind: "welcome" }, { siteUrl, name: "Test Person", country: "IN", supportEmail: replyTo ?? user });
const chrome = {
  logoUrl: `${siteUrl}/logo-mark.png`,
  siteUrl,
  to,
  greeting: greetingFor("Test Person"),
  footerLine: "allr — as in all.",
  supportEmail: replyTo ?? user,
};

// The same transport settings as src/lib/server/mail.ts (which cannot be
// imported here: it is server-only and opens Firestore).
const transport = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

console.log(`Sending "${content.subject}" from ${from} to ${to} via ${host}:${port} …`);
try {
  await transport.verify();
  const info = await transport.sendMail({
    to,
    from,
    replyTo,
    subject: `[test] ${content.subject}`,
    text: toText(content, chrome),
    html: toHtml(content, chrome),
    headers: { "X-Allr-Mail": "send-test" },
  });
  console.log(`Accepted by ${host}: ${info.response}`);
  console.log(`Message-Id: ${info.messageId}`);
  console.log(`Check the inbox (and spam) at ${to}. Headers should show DKIM=pass for allr.work.`);
} catch (e) {
  console.error(`SMTP refused: ${e?.message ?? e}`);
  console.error(
    "Common causes: wrong mailbox password; the mailbox doesn't exist (Hostinger → Emails); port 465 blocked on this network (try ALLR_SMTP_PORT=587).",
  );
  process.exitCode = 1;
} finally {
  transport.close();
}
