/**
 * Locked Allr marketing copy.
 *
 * Visual tokens live in `src/app/globals.css` (`@theme`). This file is the
 * copy bank. Do not invent a new tagline, promise, or output list on a page —
 * import from here. The contract behind these strings is DESIGN.md.
 */

export const SITE_NAME = "Allr";

export const SITE_TAGLINE =
  "the one subscription that replaces all of them";

export const SITE_TITLE = `Allr — ${SITE_TAGLINE}`;

/** ~120 chars — fits Google (~160), OG (~125), and X without truncation. */
export const SITE_DESCRIPTION =
  "One AI workspace for finished decks, docs, videos, websites, apps, and games. Describe what you want — Allr makes and ships it.";

/** Wordmark as it appears next to the mark. Always lowercase. */
export const WORDMARK = "allr";

/** The etymology line. Use in footers and quiet brand moments. */
export const ETYMOLOGY = "allr — as in all.";

/** The only first-person promise. Everywhere else, speak as a mentor to “you”. */
export const PROMISE =
  "You bring the idea. We’ll take care of everything between you and ‘it’s live.’";

export const EYEBROW_HERO = "One workspace. Finished work.";

export const HERO_HEADLINE_LEAD = "Allr";

export const HERO_HEADLINE_REST = "the one subscription that replaces all of them.";

export const HERO_SUB =
  "One AI workspace that makes finished work — decks, docs, videos, websites, apps, and games.";

export const LOOP = ["Describe it.", "Allr makes it.", "Ship it."] as const;

export const OUTPUTS = [
  {
    id: "decks",
    sticker: "📊",
    tint: "honey",
    title: "Decks",
    body: "Pitch decks, sales decks, class presentations. Structured, designed, ready to present.",
    ready: "ready",
  },
  {
    id: "docs",
    sticker: "📄",
    tint: "sage",
    title: "Docs",
    body: "Reports, proposals, essays, one-pagers. Written and formatted, not just drafted.",
    ready: "ready",
  },
  {
    id: "spreadsheets",
    sticker: "🧮",
    tint: "green",
    title: "Spreadsheets",
    body: "Models, trackers, budgets. With working formulas, not just tables.",
    ready: "ready",
  },
  {
    id: "video",
    sticker: "🎬",
    tint: "clay",
    title: "Videos & animations",
    body: "Explainers, promos, social clips. Generated, not storyboarded-and-abandoned.",
    ready: "ready",
  },
  {
    id: "websites",
    sticker: "🌐",
    tint: "green",
    title: "Websites",
    body: "Portfolios, landing pages, full sites. Live on the internet, not stuck in a builder.",
    ready: "live",
  },
  {
    id: "apps",
    sticker: "🕹️",
    tint: "honey",
    title: "Apps & games",
    body: "Working software from a description. The thing itself, not a prototype of the thing.",
    ready: "live",
  },
] as const;

export const AUDIENCES = [
  {
    id: "creators",
    sticker: "🎸",
    tint: "honey",
    title: "Creators",
    body: "Musicians, writers, artists. Build your site, your promo videos, your press kit — and put them in front of your audience.",
  },
  {
    id: "founders",
    sticker: "🚀",
    tint: "green",
    title: "Founders & solopreneurs",
    body: "Your pitch deck, your financial model, your landing page, your product demo. One subscription instead of a stack.",
  },
  {
    id: "students",
    sticker: "🎓",
    tint: "sage",
    title: "Students & educators",
    body: "Presentations, papers, interactive projects. Finished work, not formatting battles.",
  },
  {
    id: "teams",
    sticker: "🤝",
    tint: "clay",
    title: "Small teams",
    body: "Everything your team makes, in one place, shareable in one click.",
  },
] as const;

export const PROBLEM_STACK = [
  "SlideThing · $18/mo",
  "DocBot · $12/mo",
  "VidMaker · $29/mo",
  "SiteBuilder · $25/mo",
  "AppGen · $20/mo",
] as const;

export const PRICING_LINE_ITEMS = [
  "Slides $18",
  "Docs $12",
  "Video $29",
  "Sites $25",
  "Apps $20",
] as const;

export const HANDLED = [
  "Hosting",
  "Formatting",
  "Design systems",
  "Working formulas",
  "Video rendering",
  "Deployment",
  "File formats",
  "Share links",
] as const;

/** Verbs we prefer. Pair with the banned list in DESIGN.md. */
export const SAY = [
  "finished",
  "live",
  "ship",
  "make",
  "describe",
  "one",
  "ready",
  "home",
  "link",
] as const;

/** Words that make Allr sound like every other AI landing page. Do not use. */
export const NEVER_SAY = [
  "powerful",
  "seamless",
  "leverage",
  "unlock",
  "game-changing",
  "next-gen",
  "cutting-edge",
  "supercharge",
  "delve",
  "robust",
  "utilize",
  "ecosystem",
  "copilot",
  "LLM",
  "agentic",
  "orchestration",
  "self-hosted",
] as const;

/** Primary always means waitlist / early access — never install or docs. */
export const CTA = {
  primary: "Get early access",
  secondary: "See how it works",
  status: "Coming soon",
  reassurance: "No credit card required. Your first project is on us.",
  finalHeadline: "Stop stitching. Start shipping.",
  finalSub:
    "Describe what you want. Get finished work. Share it with the world.",
} as const;
