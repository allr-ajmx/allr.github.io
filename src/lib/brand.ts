/**
 * Locked Allr marketing copy.
 *
 * Visual tokens live in `src/app/globals.css` (`@theme`). This file is the
 * copy bank. Do not invent a new tagline, promise, or output list on a page —
 * import from here. The contract behind these strings is DESIGN.md.
 */

export const SITE_NAME = "Allr";

export const SITE_TAGLINE =
  "the product-and-operations platform for the AI era";

export const SITE_TITLE = `Allr — ${SITE_TAGLINE}`;

/** ~120 chars — fits Google (~160), OG (~125), and X without truncation. */
export const SITE_DESCRIPTION =
  "Allr is the product-and-operations platform for the AI era. Ideate, create, deploy, operate, and maintain AI-enabled products on web, desktop, and mobile.";

/** Wordmark as it appears next to the mark. Always lowercase. */
export const WORDMARK = "allr";

/** The etymology line. Use in footers and quiet brand moments. */
export const ETYMOLOGY = "allr — as in all.";

/** The only first-person promise. Everywhere else, speak as a mentor to “you”. */
export const PROMISE =
  "You bring the idea. We’ll take care of everything between you and ‘it’s live.’";

export const EYEBROW_HERO = "";

export const HERO_HEADLINE_LEAD = "Allr";

/** Sentence case — matches DESIGN.md §4. */
export const HERO_HEADLINE_REST =
  "the product-and-operations platform for the AI era.";

/** Single line, ≤14 words. */
export const HERO_SUB =
  "Turn AI capability into products you can deploy, run, and maintain.";

/** Access doors — last on the homepage, not the pitch. */
export const ACCESS = {
  title: "Same product. Web, desktop, or phone.",
  sub: "Open Allr wherever you work. The product life doesn’t restart per device.",
  doors: [
    { id: "web", label: "Web", body: "In the browser", tone: "ink" as const },
    { id: "desktop", label: "Desktop", body: "macOS · Windows · Linux", tone: "green" as const },
    { id: "mobile", label: "Mobile", body: "Android · iOS beta", tone: "orange" as const },
  ],
} as const;

export const LOOP = [
  "Ideate.",
  "Create.",
  "Deploy.",
  "Operate.",
  "Maintain.",
  "Scale.",
] as const;

/**
 * Historical petal / mock registry — six accents the mark still owns.
 * Not a catalogue of what ships today. Homepage does not lead with these.
 */
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

export type ShowcaseId = (typeof OUTPUTS)[number]["id"];

export const AUDIENCES = [
  {
    id: "builders",
    sticker: "🛠️",
    tint: "green",
    title: "AI product builders",
    body: "You can generate a prototype. Allr helps you make it dependable, live, and maintainable.",
  },
  {
    id: "teams",
    sticker: "🤝",
    tint: "honey",
    title: "Product teams",
    body: "One environment for experiments, journeys, and continuous operation — without rebuilding the plumbing each time.",
  },
  {
    id: "agencies",
    sticker: "🏢",
    tint: "sage",
    title: "Agencies & client teams",
    body: "A repeatable delivery workspace per client: build, hand off, and keep operating.",
  },
  {
    id: "operators",
    sticker: "📈",
    tint: "clay",
    title: "Business operators",
    body: "Sales intelligence, support, research, and internal workflows that stay running after the first build.",
  },
] as const;

export const PROBLEM_STACK = [
  "Chat tools · partial outputs",
  "Builders · stop at the prototype",
  "Billing · assembled by hand",
  "Deploy · another vendor",
  "Ops · someone else’s dashboard",
] as const;

/** Section 2 — the gap (why Allr exists). */
export const GAP = {
  title: "Generated output is not a product.",
  p1: "AI made creation abundant. Code, interfaces, agents, research, and media arrive fast. Finishing and running them did not get easier.",
  p2: "Prototypes still stall without journeys, state, deploy, monitoring, and maintenance. Token loops feel like progress without an operating outcome.",
  close:
    "Allr changes the unit of value from generated output to operating product outcome.",
  /** Optional agitation beat — one short paragraph if Gap feels soft. */
  agitation:
    "Every new build rebuilds the same foundation: accounts, journeys, billing, deploy, monitoring, support. The insight is unique. The plumbing is not.",
} as const;

/**
 * Section 3 — what we provide.
 * Six petal-indexed beats: three harnesses, then three audience reflections
 * absorbed from the retired Outcomes chapter.
 */
export const PROVIDE = {
  title: "What you get.",
  sub: "You spend time on what’s unique to your customer. Allr holds the repeated operating layer.",
  pillars: [
    {
      id: "build",
      title: "Build the product",
      body: "From brief to live surface — journeys, state, and customer paths in one place.",
      /** Optional power-user whisper — do not lead with harness jargon. */
      whisper: "The product harness",
    },
    {
      id: "intelligence",
      title: "Run the intelligence",
      body: "Research and continuous work attached to a product objective — not an open chat.",
      whisper: "The intelligence harness",
    },
    {
      id: "maintain",
      title: "Keep it alive",
      body: "History, procedures, and recovery so maintenance is continuous, not a rebuild.",
      whisper: "The maintenance harness",
    },
    {
      id: "builders",
      title: "AI product builders",
      body: "You can generate a prototype. Allr helps you make it dependable, live, and maintainable.",
      whisper: "Same barrier. Different work.",
    },
    {
      id: "teams",
      title: "Product teams",
      body: "One environment for experiments, journeys, and continuous operation — without rebuilding the plumbing each time.",
      whisper: "Same barrier. Different work.",
    },
    {
      id: "agencies-operators",
      title: "Agencies & operators",
      body: "A repeatable delivery workspace per client — and sales, support, research, and internal workflows that stay running after the first build.",
      whisper: "Same barrier. Different work.",
    },
  ],
} as const;

export const PRICING_LINE_ITEMS = [
  "Workspace core",
  "Compute pass-through",
  "Scale when you need it",
] as const;

/** In-flight product/ops primitives — not a fake media stack. */
export const HANDLED = [
  "Web access",
  "Persistent state",
  "Cross-conversation memory",
  "Desktop app",
  "Mobile app",
  "Live deployment",
  "Background work",
  "Shared product context",
] as const;

/**
 * Retired as the homepage Outcomes / value-beat lead.
 * Audience reflections live on PROVIDE.pillars (petals 3–5).
 * Homepage agents must not import VALUE_BEATS or OUTCOMES.
 */
export const VALUE_BEATS = {
  title: "More outcome. Less scaffolding.",
  beats: [
    {
      id: "efficiency",
      title: "More outcome per dollar",
      body: "Allr tunes integrations and the AI system so you spend less stitching tools together — and more finishing the product customers actually use.",
    },
    {
      id: "intelligence",
      title: "Intelligence without the maze",
      body: "We simplify the intelligence frameworks around your work so business and product work moves fast — without rebuilding the stack.",
    },
    {
      id: "scale",
      title: "Same foundation as you grow",
      body: "When usage grows, grow capacity and reliability around the same foundation — without reconstructing elsewhere.",
    },
  ],
} as const;

/**
 * @deprecated Absorbed into PROVIDE.pillars (petals 3–5). Do not import on the homepage.
 */
export const OUTCOMES = {
  title: "Same barrier. Different work.",
  sub: "Useful intent exists. The hard part is turning it into a dependable operation. Allr is the harness in the middle.",
  pattern: [
    "Domain insight",
    "Blocked from operating",
    "Allr workspace",
    "Live, maintainable product",
  ] as const,
  beats: [
    {
      id: "builders",
      title: "AI product builders",
      body: "You can generate a prototype. Allr helps you make it dependable, live, and maintainable.",
    },
    {
      id: "teams",
      title: "Product teams",
      body: "One environment for experiments, journeys, and continuous operation — without rebuilding the plumbing each time.",
    },
    {
      id: "agencies",
      title: "Agencies & client teams",
      body: "A repeatable delivery workspace per client: build, hand off, and keep operating.",
    },
    {
      id: "operators",
      title: "Business operators",
      body: "Sales intelligence, support, research, and internal workflows that stay running after the first build.",
    },
  ],
} as const;

/**
 * Homepage Contrast — why the gap stays open elsewhere (LANDING_PAGE_STORY §7.6).
 * Mentor diagnosis, not competitor dunking. Never name brands; never use NEVER_SAY.
 */
export const CONTRAST = {
  title: "Allr stays for the operating life of the product.",
  sub: "Generation is only day one. Real products need a persistent home to deploy, operate, and stay maintained.",
  rows: [
    {
      id: "chat",
      label: "Ephemeral chat",
      body: "Strong at answers and drafts. Weak at persistent product state, deploy, background work, and maintenance.",
    },
    {
      id: "builders",
      label: "Point builders",
      body: "Strong at a first interface. Weak at operating, monitoring, and keeping the system useful after launch.",
    },
    {
      id: "cloud",
      label: "Raw cloud & DIY",
      body: "Strong primitives. You still assemble journeys, intelligence, and ops by hand.",
    },
  ],
  close:
    "Allr combines product creation, intelligence execution, business operations, continuous maintenance, and a path to scale — so the product remains real after the generation step.",
} as const;

/** Verbs we prefer. Pair with the banned list in DESIGN.md. */
export const SAY = [
  "finished",
  "live",
  "ship",
  "make",
  "describe",
  "ideate",
  "operate",
  "maintain",
  "one",
  "ready",
  "home",
  "link",
  "workspace",
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

/** Primary CTA is Get Started (signup). Download is a soft door elsewhere. */
export const CTA = {
  /** @deprecated Prefer getStarted — early access is off the public door. */
  primary: "Get Started",
  getStarted: "Get Started",
  download: "Download",
  secondary: "See how it works",
  status: "Coming soon",
  reassurance: "Open an account and start when you’re ready.",
  finalHeadline: "Stop rebuilding the plumbing. Start operating.",
  finalSub: "Ideate, create, deploy, and keep the product alive.",
} as const;

export const HERO_HEADLINE = HERO_HEADLINE_REST;

/**
 * Hero workspace demo — one honest product-ops beat, not a catalogue of
 * finished creative outputs. Uses the `apps` mock as a standing-in live surface.
 */
export const WORKSPACE_DEMO = {
  id: "apps" as const satisfies ShowcaseId,
  tab: "Workspace",
  noun: "product",
  prompt:
    "A workspace for our research product: capture the brief, keep state, and keep it running after we deploy.",
  caption:
    "Ideate once. Build in a persistent workspace. Deploy it, then keep operating it.",
  slug: "research-ops",
} as const;

/** @deprecated Prefer WORKSPACE_DEMO. Kept for petal/mock id compatibility. */
export const SHOWCASE = [WORKSPACE_DEMO] as const;

export const WORKSPACE = {
  making: (noun: string) => `Building your ${noun}…`,
  live: "It’s operating.",
  you: "You",
  steps: ["Understood the brief", "Built in the workspace", "Deployed and live"],
} as const;

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
  title: "Same product, in your pocket.",
  sub: "Ask from the bus. Pick it up on desktop. Every project, every version — web, desktop, phone, and tablet.",
  /** Into the mobile closed beta on /app — never the general early-access list. */
  cta: "Join the mobile beta",
  ask: "Continue yesterday’s research brief — keep the same product context and prep the next operating step.",
  reply: "Done. Same product context — ready when you are.",
  notif: {
    app: "Allr",
    title: "Ready to continue",
    body: "research-ops · tap to open",
  },
  projects: [
    { name: "Research ops", kind: "Product", when: "2m", live: true },
    { name: "Customer brief", kind: "Intel", when: "just now", live: true },
    { name: "Deploy checklist", kind: "Ops", when: "Tue", live: true },
    { name: "Memory notes", kind: "Memory", when: "Mon", live: false },
    { name: "Mobile sync", kind: "App", when: "Sun", live: true },
  ],
} as const;

export const STORY = [
  {
    title: "Ideate.",
    body: "Describe the product, the customer, and the outcome in plain language. Capture the brief before anything is built.",
    aside: "Start with intent — not a blank tool stack.",
  },
  {
    title: "Create.",
    body: "Allr builds the product surface, state, and workflows that stay with what you’re making.",
    aside: "Context stays with the product.",
  },
  {
    title: "Deploy.",
    body: "Put the product on a live surface people can reach — a link, a channel, an internal interface.",
    aside: "Live means reachable, not stuck in a chat.",
  },
  {
    title: "Operate.",
    body: "Background work, monitoring, and customer operations continue without keeping a session open.",
    aside: "The product keeps working after you close the lid.",
  },
  {
    title: "Maintain.",
    body: "State, history, and procedures stay with the product so you improve it instead of rebuilding it.",
    aside: "Maintenance is continuous — not an emergency project.",
  },
  {
    title: "Scale.",
    body: "When usage grows, grow capacity and reliability around the same foundation — without starting over elsewhere.",
    aside: "The account expands because the product succeeds.",
  },
] as const;

export const LIFECYCLE = {
  title: "Ideate once. Operate for real.",
  sub: "Allr stays with the product from the first brief through deploy, operation, maintenance, and scale.",
} as const;

export const BLOOM = {
  title: "Whatever you’re making, it comes back finished.",
  sub: "A deck today, a site tomorrow, an app next month. Every turn of the mark is one more thing Allr finishes and publishes — here are a few.",
  more: "…and whatever you ask for next.",
} as const;

export type ProgressStatus = "available" | "progress" | "upcoming";

/**
 * Honest platform strip — what is live vs what is still landing.
 * Desktop chip reads green; mobile chip reads orange (honey/amber tokens).
 */
export const PLATFORM_PROGRESS = {
  title: "What’s here now — and what’s next.",
  sub: "An honest look at the platform as it grows. Available today, in progress, or upcoming.",
  legend: [
    { status: "available" as const, label: "Available" },
    { status: "progress" as const, label: "In progress" },
    { status: "upcoming" as const, label: "Upcoming" },
  ],
  items: [
    {
      id: "cloud",
      name: "Web platform",
      status: "available" as const,
      note: "Browser access",
    },
    {
      id: "desktop",
      name: "Desktop application",
      status: "available" as const,
      note: "macOS · Windows · Linux",
      chip: "desktop" as const,
    },
    {
      id: "mobile",
      name: "Mobile application",
      status: "progress" as const,
      note: "Android · iOS closed beta",
      chip: "mobile" as const,
    },
    {
      id: "memory",
      name: "Improved memory",
      status: "progress" as const,
      note: "Cross-conversation reference",
    },
    {
      id: "research",
      name: "Improved web research",
      status: "upcoming" as const,
      note: "Upcoming",
    },
    {
      id: "pm",
      name: "Product management",
      status: "upcoming" as const,
      note: "Upcoming",
    },
    {
      id: "intel-net",
      name: "Intelligence network",
      status: "upcoming" as const,
      note: "Upcoming",
    },
    {
      id: "pdf",
      name: "Product development framework",
      status: "upcoming" as const,
      note: "Upcoming",
    },
    {
      id: "billing",
      name: "Billing rail",
      status: "upcoming" as const,
      note: "Upcoming",
    },
  ],
} as const;

export {
  ALL_ROADMAP_ITEMS,
  ROADMAP_PAGE_COPY,
  ROADMAP_TRACK_IMPROVEMENTS,
  ROADMAP_TRACK_STORY,
  type RoadmapItem,
  type RoadmapStatus,
  type RoadmapTrack,
} from "./roadmap";

export const ROADMAP = {
  title: "What’s coming to the platform.",
  sub: "An honest look at what we’re building — operating foundation first, creative suites second.",
  items: [
    {
      id: "research",
      name: "Improved web research",
      body: "Deeper, recurring research that stays attached to the product objective — not one-off answers.",
    },
    {
      id: "pm",
      name: "Product management",
      body: "Structure for requirements, journeys, and operating decisions alongside the product life.",
    },
    {
      id: "intel-net",
      name: "Intelligence network",
      body: "Connected intelligence loops across research, accounts, and continuous background work.",
    },
    {
      id: "pdf",
      name: "Product development framework",
      body: "Reusable patterns that move a brief from ideate to deploy without rebuilding the foundation.",
    },
    {
      id: "billing",
      name: "Billing rail",
      body: "Integrated payment and subscription logic so products can collect value without assembling billing from scratch.",
    },
  ],
} as const;

export const HOSTED = {
  title: "Deploy once. Keep operating.",
  p1: "Generation tools stop when the chat ends. Allr keeps going: the product stays reachable on the web, and open from desktop or mobile.",
  p2: "State, versions, and operating context stay with the product. Change course without losing the brief. Nothing important lives only in a downloads folder.",
  source: { version: "v1", note: "Deployed from Allr" },
  center: "Hosted by Allr",
  url: "allr.work/research-ops",
  visitors: [
    "You · web",
    "Teammate · desktop",
    "On the go · phone",
    "Review · tablet",
    "Ops · desktop",
  ],
  aside: "Because the point was never the draft. The point was a product that keeps running.",
} as const;

export const SOLUTION = {
  title: "More outcome. Less scaffolding.",
  p1: "Allr is built so you spend less time assembling the operating layer — and more time on the product customers actually use.",
  p2: "No stitching a chat tool to a builder to a host to an ops dashboard. One place for the product’s life.",
} as const;

export const FAQ = [
  {
    q: "What is Allr?",
    a: "Allr is the product-and-operations platform for the AI era — on web, desktop, and mobile — where you ideate, create, deploy, operate, and maintain AI-enabled products.",
  },
  {
    q: "Is this another chatbot?",
    a: "No. Chat ends when the session ends. Allr is built for persistent products: state, deploy, operate, and maintain — not another pile of partial outputs.",
  },
  {
    q: "Where can I use it?",
    a: "In the browser, on the desktop app for macOS, Windows, and Linux, and on mobile (Android and iOS closed beta).",
  },
  {
    q: "How do I start?",
    a: "Get Started to open an account. Download the desktop app anytime if you want it on your machine — the product is the same either way.",
  },
  {
    q: "How is Allr different from a coding assistant?",
    a: "Assistants help you generate. Allr is built so the product can stay live and maintained after generation.",
  },
] as const;

export const DOWNLOAD = {
  title: "Download Allr",
  sub: "The desktop door to Allr — macOS, Windows, and Linux. Same product on web and, soon, on your phone.",
  yours: "Your platform",
  requirements: "Requirements",
  version: (v: string, when: string | null) =>
    when ? `Allr Desktop v${v} · ${when}` : `Allr Desktop v${v}`,
  /** Shown when the release API was unreachable at build time. */
  versionUnknown: "Latest release",
  mobileTitle: "On your phone",
  mobileBody:
    "Allr for phone and tablet opens the same product. Get on the mobile beta list and we’ll write when it’s your turn.",
  mobileCta: "Join the mobile beta",
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
 * The app page (`/app`). Clients open Allr on the devices you already use.
 */
export const APP = {
  title: "The app",
  /** ~120 chars, matching SITE_DESCRIPTION. */
  description:
    "Open Allr on desktop and mobile — the Product and Operations platform, on every device you own.",

  hero: {
    headline: "Your product, on every device.",
    subLead: "Desktop and mobile open the same ",
    subSwash: "Allr",
    subRest: " — ideate, create, deploy, and keep operating.",
    betaTitle: "Android and iOS are in closed beta",
    betaSub: "The same product, on your phone.",
    betaCta: "Join the beta",
  },

  one: {
    title: "Web, desktop, and mobile — one product",
    body: "Allr is the product. The apps are how you open it on the devices you already use.",
    legend: [
      { status: "planned", label: "Upcoming" },
      { status: "progress", label: "In progress" },
      { status: "working", label: "Available" },
    ],
    modules: [
      { name: "Web platform", status: "working" },
      { name: "Desktop application", status: "working" },
      { name: "Mobile application", status: "progress" },
      { name: "Improved memory", status: "progress" },
      { name: "Improved web research", status: "planned" },
      { name: "Product management", status: "planned" },
      { name: "Intelligence network", status: "planned" },
      { name: "Product development framework", status: "planned" },
      { name: "Billing rail", status: "planned" },
    ],
    card: {
      title: "Allr",
      body: "One login, three doors — browser, desktop, and phone — without rebuilding your product’s foundation for each device.",
      platforms: "Web, Windows, macOS, Linux, Android and iOS.",
    },
  },

  inside: {
    title: "Ready to go",
    capabilities: [
      {
        title: "The full product surface",
        body: "Briefs, files, previews, and project status — side by side, with Allr working beside you.",
        tint: "green",
        icon: "workspace",
      },
      {
        title: "Allr drives it",
        body: "It opens a preview, runs a step, reveals a pane, and walks you through a task. The app is something it uses, not just something it talks about.",
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
        body: "Schedule a job, hand a task off to run on its own, and let it keep going across machines. Close the lid; come back to an operating product.",
        tint: "clay",
        icon: "clock",
      },
      {
        title: "Connect anywhere",
        body: "On this machine, on another one of yours, or hosted for you — all managed from one screen.",
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
    body: "Memory, research, product management, intelligence network, frameworks, and billing rail — see the public roadmap for what’s next.",
  },

  get: {
    title: "Get the app",
    betaLead: "Android and iOS are in ",
    betaStrong: "closed beta",
    betaRest: ". The same Allr, on your phone.",
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
