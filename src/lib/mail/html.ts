/**
 * One layout for every email, rendered twice from the same `Content`: HTML
 * for mail clients, plain text for everything else (and for the part of the
 * HTML a spam filter reads). Inline styles, tables, no web fonts — the
 * palette and faces are DESIGN.md's, in the forms email can carry.
 */

import type { Content } from "./content.ts";

/* DESIGN.md §5 */
const PAPER = "#FDFCF9";
const CARD = "#FFFFFF";
const INK = "#223B33";
const INK_SOFT = "#5C7168";
const LINE = "#E7E0D2";
const GREEN = "#2E9E63";
const HONEY_DEEP = "#B77E1F";

const SANS = `'Nunito Sans', 'Segoe UI', Helvetica, Arial, sans-serif`;
const SERIF = `'Young Serif', Georgia, 'Times New Roman', serif`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) links are ever rendered as links. */
export function safeHref(href: string): string | null {
  return /^https?:\/\/[^\s"'<>]+$/i.test(href) ? href : null;
}

export type Chrome = {
  /** Absolute URL of the logo PNG. */
  logoUrl: string;
  /** Where the wordmark links. */
  siteUrl: string;
  /** Who this went to, named in the footer so forwarding makes sense. */
  to: string;
  /** First-name greeting; omitted when unknown. */
  greeting: string | null;
  /** "allr — as in all." */
  footerLine: string;
  /** An address a person reads, if there is one. */
  supportEmail: string | null;
};

export function toHtml(c: Content, k: Chrome): string {
  const e = escapeHtml;
  const cta = c.cta && safeHref(c.cta.href);
  const paragraphs = c.paragraphs
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;font:400 16px/1.7 ${SANS};color:${INK};">${e(p)}</p>`)
    .join("");
  const rows = c.rows?.length
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 20px;border-collapse:collapse;">${c.rows
        .map(
          (r) =>
            `<tr><td style="padding:8px 0;border-top:1px solid ${LINE};font:700 14px/1.5 ${SANS};color:${INK_SOFT};vertical-align:top;width:45%;">${e(r.label)}</td><td style="padding:8px 0 8px 12px;border-top:1px solid ${LINE};font:400 14px/1.5 ${SANS};color:${INK};vertical-align:top;">${e(r.value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const button = cta
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 20px;"><tr><td style="border-radius:10px;background:${GREEN};"><a href="${e(cta)}" style="display:inline-block;padding:12px 22px;font:800 15px/1 ${SANS};color:#ffffff;text-decoration:none;border-radius:10px;">${e(c.cta!.label)}</a></td></tr></table>`
    : "";
  const note = c.note ? `<p style="margin:0 0 8px;font:700 14px/1.6 ${SANS};color:${HONEY_DEEP};">${e(c.note)}</p>` : "";
  const greeting = k.greeting ? `<p style="margin:0 0 12px;font:400 16px/1.7 ${SANS};color:${INK};">${e(k.greeting)}</p>` : "";
  const support = k.supportEmail
    ? ` Questions? Write to <a href="mailto:${e(k.supportEmail)}" style="color:${INK_SOFT};">${e(k.supportEmail)}</a>.`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="light">
<title>${e(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};">${e(c.preview)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${PAPER};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;">
<tr><td style="padding:0 4px 18px;">
<a href="${e(k.siteUrl)}" style="text-decoration:none;display:inline-block;">
<img src="${e(k.logoUrl)}" width="36" height="36" alt="Allr" style="display:inline-block;vertical-align:middle;border:0;">
<span style="display:inline-block;vertical-align:middle;margin-left:10px;font:400 22px/1 ${SERIF};color:${INK};">allr</span>
</a>
</td></tr>
<tr><td style="background:${CARD};border:1px solid ${LINE};border-radius:16px;padding:28px 28px 16px;">
<h1 style="margin:0 0 14px;font:400 26px/1.2 ${SERIF};color:${INK};">${e(c.heading)}</h1>
${greeting}${paragraphs}${rows}${button}${note}
</td></tr>
<tr><td style="padding:18px 4px 0;font:400 12px/1.6 ${SANS};color:${INK_SOFT};">
${e(k.footerLine)}<br>
Sent to ${e(k.to)} because you have an Allr account.${support}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function toText(c: Content, k: Chrome): string {
  const lines: string[] = [];
  lines.push(c.heading, "");
  if (k.greeting) lines.push(k.greeting, "");
  for (const p of c.paragraphs.filter(Boolean)) lines.push(p, "");
  if (c.rows?.length) {
    for (const r of c.rows) lines.push(`${r.label}: ${r.value}`);
    lines.push("");
  }
  if (c.cta) lines.push(`${c.cta.label}: ${c.cta.href}`, "");
  if (c.note) lines.push(c.note, "");
  lines.push("—", k.footerLine, `Sent to ${k.to} because you have an Allr account.${k.supportEmail ? ` Questions? Write to ${k.supportEmail}.` : ""}`);
  return lines.join("\n");
}

/** "Hi Kamal," from a legal name; null when there is no name to use. */
export function greetingFor(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : null;
}
