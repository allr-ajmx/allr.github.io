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

export const HERO_HEADLINE = HERO_HEADLINE_REST;

/**
 * The hero workspace. One tab per kind of thing Allr makes; each carries the
 * ask that produced it, the caption beside the tabs, and the link it got.
 * Everything in the window is HTML — no pictures of paper.
 */
export const SHOWCASE = [
  {
    id: "decks",
    tab: "Decks",
    noun: "deck",
    prompt: "A ten-slide pitch deck for Northwind Coffee's seed round.",
    caption: "Ask for a deck. Get one you could present in the next meeting.",
    slug: "northwind-seed",
  },
  {
    id: "docs",
    tab: "Docs",
    noun: "doc",
    prompt: "A two-page proposal for the community garden grant, formal but warm.",
    caption: "Written, formatted, and ready to send — not a draft to finish.",
    slug: "garden-grant",
  },
  {
    id: "spreadsheets",
    tab: "Sheets",
    noun: "budget",
    prompt: "A twelve-month studio budget with rent, payroll, and a runway line.",
    caption: "Real formulas. Change a number and everything downstream updates.",
    slug: "studio-budget",
  },
  {
    id: "video",
    tab: "Video",
    noun: "video",
    prompt: "A forty-second teaser for the album, lyrics over the artwork.",
    caption: "Rendered and shareable, with a page of its own.",
    slug: "album-teaser",
  },
  {
    id: "websites",
    tab: "Sites",
    noun: "site",
    prompt: "A landing page for the album launch with a mailing list signup.",
    caption: "On the internet the moment it's done, at a link that's yours.",
    slug: "album-launch",
  },
  {
    id: "apps",
    tab: "Apps",
    noun: "app",
    prompt: "A simple habit tracker my study group can use on their phones.",
    caption: "Working software from a description. The thing, not a prototype.",
    slug: "habit-tracker",
  },
] as const;

export type ShowcaseId = (typeof SHOWCASE)[number]["id"];

export const WORKSPACE = {
  making: (noun: string) => `Making your ${noun}…`,
  live: "It’s live.",
  you: "You",
  steps: ["Understood the ask", "Made it", "Published it"],
} as const;

/** Pre-launch pricing. One line, no math. */
export const PRICING = {
  eyebrow: "Pricing",
  line: "One plan. Priced when we launch.",
  sub: "The waitlist hears first, and your first project is on us.",
} as const;

export const WAITLIST_DONE = {
  headline: "You’re on the list.",
  sub: "We’ll write when it’s your turn.",
  stamp: "In line",
  share: "Share Allr",
  copied: "Link copied",
} as const;

export const PHONE = {
  eyebrow: "On your phone",
  title: "The same workspace, in your pocket.",
  sub: "Ask from the bus. It’s live before you get off. Every project, every link, every version — on desktop, phone and tablet, and in the chats you already use.",
  ask: "Turn the Northwind deck into a one-page summary for the investor I’m meeting at 3.",
  reply: "Done. One page, same numbers, and it’s live at the link below.",
  notif: { app: "Allr", title: "Your summary is ready", body: "northwind-onepager · tap to open" },
  chats: ["Telegram", "WhatsApp", "Slack", "Discord", "Signal"],
  chatsLead: "Or just message it:",
} as const;

export const STORY = [
  {
    title: "Describe it.",
    body: "Tell Allr what you need in plain language — a deck, a page, a budget. No jargon, no settings, no templates to pick first.",
    aside: "Say it like you'd say it to a friend.",
  },
  {
    title: "Allr makes it.",
    body: "It picks the right tools behind the scenes and makes the finished thing — designed, formatted, with the numbers working.",
    aside: "The seal comes down. That's your work, done.",
  },
  {
    title: "Ship it.",
    body: "A link for your deck, a live URL for your site, a page for your video. Every change is a new version you can go back to.",
    aside: "That feeling when it's out in the world? That's the point.",
  },
] as const;
