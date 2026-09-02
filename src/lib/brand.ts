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
  download: "Download",
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
/**
 * The agent workspace, not the client.
 *
 * Two products with two pricing stories: the desktop and mobile apps are free
 * to download and stay free ("beta · free forever" under the download button),
 * and the agent workspace they connect to is what carries a plan. Never let a
 * line here imply the app costs money, or a line on /download imply the
 * workspace is free. Nothing renders PRICING today — Pricing.tsx has been
 * unimported since 725b69b — so this is the copy bank for when it returns.
 */
export const PRICING = {
  eyebrow: "Pricing",
  line: "One plan. Priced when we launch.",
  sub: "The waitlist hears first, and your first project is on us.",
} as const;

/** Shown under the field when a signup could not be taken. */
export const WAITLIST_ERRORS = {
  invalid: "Try that email again?",
  /** No backend configured — nothing was saved, so never say it was. */
  unavailable: "The list isn’t reachable just now. Try again in a minute?",
} as const;

export const WAITLIST_DONE = {
  headline: "You’re on the list.",
  already: "You’re already on the list.",
  sub: "We’ll write when it’s your turn.",
  stamp: "In line",
  share: "Share Allr",
  copied: "Link copied",
} as const;

export const PHONE = {
  eyebrow: "On your phone",
  title: "The same workspace, in your pocket.",
  sub: "Ask from the bus. It’s live before you get off. Every project, every link, every version — the same workspace on desktop, phone and tablet.",
  /** Into the mobile closed beta on /app — never the general early-access list. */
  cta: "Join the mobile beta",
  ask: "Turn the Northwind deck into a one-page summary for the investor I’m meeting at 3.",
  reply: "Done. One page, same numbers, and it’s live at the link below.",
  notif: { app: "Allr", title: "Your summary is ready", body: "northwind-onepager · tap to open" },
  projects: [
    { name: "Northwind seed deck", kind: "Deck", when: "2m", live: true },
    { name: "Investor one-pager", kind: "Doc", when: "just now", live: true },
    { name: "Album launch site", kind: "Site", when: "Tue", live: true },
    { name: "Studio budget", kind: "Sheet", when: "Mon", live: false },
    { name: "Habit tracker", kind: "App", when: "Sun", live: true },
  ],
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

export const BLOOM = {
  eyebrow: "What Allr makes",
  title: "Whatever you’re making, it comes back finished.",
  sub: "A deck today, a site tomorrow, an app next month. Every turn of the mark is one more thing Allr finishes and publishes — here are a few.",
  more: "…and whatever you ask for next.",
} as const;

export const HOSTED = {
  eyebrow: "It’s live",
  title: "Your work gets a home, a link, and an audience.",
  p1: "Every other AI tool stops at the download button. Allr keeps going: the moment a thing is finished, it’s hosted — on the internet, at a link that’s yours, for anyone you send it to.",
  p2: "Every change is a new version. Change your mind? Go back to the one you liked, in one click. Nothing you make ever gets lost in a downloads folder.",
  source: { version: "v4", note: "Added the press kit link" },
  center: "Hosted by Allr",
  url: "allr.app/album-launch",
  visitors: ["Mia · phone", "Investor · laptop", "Press · tablet", "Fans · phone", "Studio · desktop"],
  aside: "Because the point was never the file. The point was people seeing it.",
} as const;

export const DOWNLOAD = {
  title: "Download Allr",
  sub: "The desktop app for macOS, Windows and Linux. Describe what you need; it comes back finished, and published.",
  yours: "Your platform",
  requirements: "Requirements",
  version: (v: string, when: string | null) =>
    when ? `Allr Desktop v${v} · ${when}` : `Allr Desktop v${v}`,
  /** Shown when the release API was unreachable at build time. */
  versionUnknown: "Latest release",
  mobileTitle: "On your phone",
  mobileBody: "Allr for phone and tablet is on its way. Get on the list and we’ll write when it’s your turn.",
  mobileCta: "Get early access",
  back: "Back to Allr",
  /** Per-platform, keyed by `Platform` in `lib/releases.ts`. */
  needs: {
    macos: "Apple silicon and Intel — one universal build.",
    windows: "Windows 10 or later, 64-bit.",
    linux: "x86-64. The AppImage and tarball run on most distributions; the .deb is for Debian and Ubuntu, the .rpm for Fedora, RHEL and openSUSE.",
  },
  seeApp: "See the app",
} as const;

/**
 * The app page (`/app`). One idea: every tool you work in, in one place, on
 * every device you own.
 *
 * Ported from the primary-website `/client` page and rewritten into the voice
 * in DESIGN.md — same sections, same ideas, none of the power-user words from
 * NEVER_SAY. Anything about how we build or release the app belongs in the
 * repo, not on this page.
 */
export const APP = {
  title: "The app",
  /** ~120 chars, matching SITE_DESCRIPTION. */
  description:
    "One app for all of it — writing, design, video, publishing — on your desktop and, soon, on your phone.",

  hero: {
    headline: "One app for all of it.",
    subLead: "Every tool you work in, brought together ",
    subSwash: "in one place",
    subRest: ", on every device you own.",
    betaTitle: "Android and iOS are in closed beta",
    betaSub: "The whole app, on your phone.",
    betaCta: "Join the beta",
  },

  one: {
    eyebrow: "One place",
    title: "Everything in one window",
    body: "Documents, video, design, marketing, publishing, automation — today each one is its own app, its own login, its own island. Allr is where all of it comes together.",
    legend: [
      { status: "planned", label: "Planned" },
      { status: "progress", label: "In progress" },
      { status: "working", label: "Working" },
    ],
    modules: [
      { name: "Docs, sheets and decks", status: "planned" },
      { name: "Video editing", status: "planned" },
      { name: "Design and images", status: "planned" },
      { name: "Marketing that runs itself", status: "planned" },
      { name: "Publishing and marketplace", status: "planned" },
      { name: "Automations", status: "planned" },
      { name: "Apps that run themselves", status: "planned" },
      { name: "Memory that learns your work", status: "planned" },
    ],
    card: {
      title: "Allr",
      body: "One window, one login, one set of shortcuts — and a workspace that reaches every part of it without you switching apps.",
      platforms: "Windows, macOS, Linux, Android and iOS.",
    },
  },

  inside: {
    eyebrow: "Inside the app",
    title: "A whole workspace, ready to go",
    capabilities: [
      {
        title: "The full workspace",
        body: "Writing, editing, files, previews and project status — side by side in panes you can resize, with Allr working in them beside you.",
        tint: "green",
        icon: "workspace",
      },
      {
        title: "Allr drives it",
        body: "It opens a preview, runs a step, reveals a pane, rearranges your layout and walks you through a task. The app is something it uses, not just something it talks about.",
        tint: "honey",
        icon: "spark",
      },
      {
        title: "Add what you need",
        body: "Browse, install and set up add-ons from one screen. Add one by link, watch how it’s doing, and give it its own place in the app.",
        tint: "sage",
        icon: "puzzle",
      },
      {
        title: "Work that runs without you",
        body: "Schedule a job, hand a task off to run on its own, and let it keep going across machines. Close the lid; come back to finished work.",
        tint: "clay",
        icon: "clock",
      },
      {
        title: "Connect to any workspace",
        body: "On this machine, on another one of yours, or hosted for you — all managed from one screen. Every home for your work, the same app.",
        tint: "green",
        icon: "link",
      },
      {
        title: "Always a keystroke away",
        body: "It waits quietly with a tray icon and one shortcut. A single input bar appears over whatever you were doing, and grows as it answers.",
        tint: "honey",
        icon: "bolt",
      },
    ],
  },

  growing: {
    title: "And it keeps growing",
    body: "New things land continuously — voice on the device, more add-ons, more of the workspace under Allr’s hands. The app is growing faster than any one of the tools it replaces.",
  },

  get: {
    title: "Get the app",
    betaLead: "Android and iOS are in ",
    betaStrong: "closed beta",
    betaRest: ". The same app, the same screens, on your phone.",
    betaCta: "Join the beta",
    betaSending: "Sending…",
    betaDone: "You’re on the list.",
    betaDoneSub: "Invites go out in batches, so it may be a little while.",
    betaLegend: "Which platform?",
    betaPlatforms: [
      { id: "android", label: "Android" },
      { id: "ios", label: "iOS" },
      { id: "either", label: "Either" },
    ],
  },

  download: {
    /** Under the buttons, next to the version. */
    free: "beta · free forever",
    version: (v: string) => `Version ${v}`,
    versionUnknown: "Latest release",
    forPlatform: (name: string) => `Download for ${name}`,
    /** Before the visitor's platform is known — and what the server renders. */
    anyPlatform: "Download the app",
  },
} as const;
