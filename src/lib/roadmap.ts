/**
 * Roadmap dataset for Allr (/roadmap).
 *
 * Grounded in ALLR_UPDATED_MASTER_STORY.md and DESIGN.md.
 * Two sequential tracks:
 * 1. The Allr Story Foundation (18 items: Product Harness, Intelligence Harness, Maintenance Harness, Scale Path).
 * 2. Product & Surface Improvements (8 items: Creation suites, authoring surfaces, media tools, and direct guidance).
 */

export type RoadmapTrack = "story" | "improvements";

export type RoadmapStatus = "available" | "progress" | "upcoming";

export interface RoadmapItem {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  track: RoadmapTrack;
  pillar: string;
  status: RoadmapStatus;
  statusLabel: string;
  tint: "honey" | "sage" | "green" | "clay";
}

export const ROADMAP_TRACK_STORY: RoadmapItem[] = [
  {
    id: "billing-rails",
    number: "01",
    title: "Prebuilt Billing Rails",
    subtitle: "Collect revenue without hand-stitching payment processors",
    description:
      "Integrated checkout flows, subscription state, and webhooks for Stripe and Razorpay. Connect your keys once; your live product collects payments on day one.",
    track: "story",
    pillar: "Product Harness · Monetization",
    status: "progress",
    statusLabel: "In progress",
    tint: "honey",
  },
  {
    id: "domain-management",
    number: "02",
    title: "Domain Name Management",
    subtitle: "Custom domains, automated certificates, and DNS routing",
    description:
      "Point your own domain to any deployed product in clicks. Automatic SSL issuance, certificate renewal, and record verification without touching external cloud consoles.",
    track: "story",
    pillar: "Product Harness · Deployment",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "green",
  },
  {
    id: "security-hardening",
    number: "03",
    title: "Application Hardening & Security Harness",
    subtitle: "Production guardrails, environment isolation, and secrets",
    description:
      "Keep live applications protected with secret isolation, sanitised inputs, rate limits, and secure defaults that prevent common deployment vulnerabilities.",
    track: "story",
    pillar: "Product Harness · Security",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
  {
    id: "pm-frameworks",
    number: "04",
    title: "Product Management Frameworks",
    subtitle: "Structured requirements, user journeys, and feature lifecycles",
    description:
      "Move from initial brief to structured user journeys, specifications, and scope boundaries. Decisions stay tracked alongside the product as it evolves.",
    track: "story",
    pillar: "Product Harness · Product Operations",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "clay",
  },
  {
    id: "pdf-frameworks",
    number: "05",
    title: "Product Development Frameworks",
    subtitle: "Reusable architectures from ideation to live release",
    description:
      "Standardized patterns that turn intent into application surfaces. Skip repetitive plumbing so you can focus entirely on what makes your product unique.",
    track: "story",
    pillar: "Product Harness · Engineering Baseline",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "honey",
  },
  {
    id: "data-book-manager",
    number: "06",
    title: "Data Book Manager",
    subtitle: "Structured operational schemas and product knowledge records",
    description:
      "A persistent repository for your product schemas, configuration matrices, reference tables, and operational records that your agents reference reliably.",
    track: "story",
    pillar: "Product Harness · Data State",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
  {
    id: "agent-builder",
    number: "07",
    title: "Agent Builder",
    subtitle: "Define roles, tool boundaries, and operational mandates",
    description:
      "Create purposeful agents with explicit permissions, connected toolsets, and scoped responsibilities rather than relying on unbounded chat loops.",
    track: "story",
    pillar: "Intelligence Harness · Workflows",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "green",
  },
  {
    id: "graph-builder",
    number: "08",
    title: "Graph Builder",
    subtitle: "Deterministic multi-step pipelines and agent handoffs",
    description:
      "Visually map out execution graphs for complex workflows. Define explicit dependencies, error fallbacks, and human approval checkpoints between steps.",
    track: "story",
    pillar: "Intelligence Harness · Execution",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "clay",
  },
  {
    id: "gtm-intel-network",
    number: "09",
    title: "Intelligence Network for GTM",
    subtitle: "Continuous market intelligence, lead discovery, and customer signals",
    description:
      "Scheduled background research that monitors competitors, surfaces market signals, and assists go-to-market workflows with live customer context.",
    track: "story",
    pillar: "Intelligence Harness · Market Operations",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "honey",
  },
  {
    id: "ai-pipeline-management",
    number: "10",
    title: "AI Pipeline Management & Generation",
    subtitle: "Scheduled batch runs and recurring intelligence flows",
    description:
      "Configure, schedule, and maintain recurring intelligence jobs. Work runs automatically in the background even when you close the workspace.",
    track: "story",
    pillar: "Intelligence Harness · Background Work",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
  {
    id: "acp-agent-integration",
    number: "11",
    title: "ACP Agent Integration",
    subtitle: "Connect external coding agents and local tools directly into Allr",
    description:
      "Open standard Agent Client Protocol integration. Connect your preferred coding agents and external environments straight into the Allr workspace without losing context.",
    track: "story",
    pillar: "Intelligence Harness · Tool Connectivity",
    status: "progress",
    statusLabel: "In progress",
    tint: "green",
  },
  {
    id: "memory-recall",
    number: "12",
    title: "Improved Recall from Memory",
    subtitle: "Cross-conversation context and persistent project knowledge",
    description:
      "A workspace that remembers previous decisions, customer context, and architectural constraints across every session, without needing prompt repetition.",
    track: "story",
    pillar: "Intelligence Harness · Persistent Memory",
    status: "progress",
    statusLabel: "In progress",
    tint: "honey",
  },
  {
    id: "improved-learning",
    number: "13",
    title: "Improved Learning & Adaptation",
    subtitle: "Retain procedures, user preferences, and feedback",
    description:
      "The workspace learns from past corrections, accepted edits, and operational decisions to handle future tasks with greater accuracy and consistency.",
    track: "story",
    pillar: "Intelligence Harness · Continuous Improvement",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "clay",
  },
  {
    id: "watchdog-agents",
    number: "14",
    title: "Watchdog Agents",
    subtitle: "Continuous health checks, anomaly detection, and automated recovery",
    description:
      "Autonomous monitors that keep watch over live deployments, alert you to broken endpoints or failed dependencies, and trigger recovery steps.",
    track: "story",
    pillar: "Maintenance Harness · Observability",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
  {
    id: "auditor",
    number: "15",
    title: "Auditor",
    subtitle: "Traceable activity logs, compliance checks, and quality assurance",
    description:
      "Comprehensive audit trails recording code changes, agent actions, data access, and verification checks so every live system remains accountable.",
    track: "story",
    pillar: "Maintenance Harness · Governance",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "green",
  },
  {
    id: "operations-optimization",
    number: "16",
    title: "Product & Operations Optimization Framework",
    subtitle: "Latency tracking, compute cost auditing, and operational telemetry",
    description:
      "Measure how efficiently your products and intelligence workflows run. Identify latency bottlenecks, trim compute overhead, and optimize pass-through costs.",
    track: "story",
    pillar: "Maintenance Harness · Performance",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "honey",
  },
  {
    id: "auto-scale-cloud",
    number: "17",
    title: "Auto-Scale Cloud Services (GCP & AWS)",
    subtitle: "Expand capacity and infrastructure as customer demand grows",
    description:
      "Move products smoothly into higher-capacity tiers on Google Cloud and AWS. Scale compute, databases, and bandwidth without rewriting foundations.",
    track: "story",
    pillar: "Scale Path · Infrastructure",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "clay",
  },
  {
    id: "team-management",
    number: "18",
    title: "Team Management & Shared Context",
    subtitle: "Collaborative workspaces, role-based controls, and shared state",
    description:
      "Bring teammates, collaborators, or client reviewers into dedicated project spaces with granular access permissions and synchronized project state.",
    track: "story",
    pillar: "Scale Path · Collaboration",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
];

export const ROADMAP_TRACK_IMPROVEMENTS: RoadmapItem[] = [
  {
    id: "web-interface-upgrade",
    number: "19",
    title: "Web Interface Upgrade",
    subtitle: "Faster navigation, unified project inspector, and focused density",
    description:
      "A refreshed web experience with paper-toned ergonomics, faster project switching, collapsible sidebars, and direct access to live deployment telemetry.",
    track: "improvements",
    pillar: "Workspace Surface",
    status: "available",
    statusLabel: "Available",
    tint: "green",
  },
  {
    id: "design-maker",
    number: "20",
    title: "Design Maker Interface",
    subtitle: "Visual canvas for crafting live layouts, components, and pages",
    description:
      "Create and refine responsive user interfaces on a direct visual canvas. Export finished components straight into your live product code.",
    track: "improvements",
    pillar: "Design & UI",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "honey",
  },
  {
    id: "demo-maker-video-editor",
    number: "21",
    title: "Product Demo Maker & Video Editor",
    subtitle: "Record, script, and edit product walkthroughs and feature reels",
    description:
      "Assemble professional demo videos directly inside Allr. Capture browser flows, add automated captions, arrange clips, and publish polished showcase reels.",
    track: "improvements",
    pillar: "Media & Video",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "clay",
  },
  {
    id: "complete-office-suite",
    number: "22",
    title: "Complete Office Suite (Docs, Decks & Spreadsheets)",
    subtitle: "Native documents, presentation slides, and data sheets",
    description:
      "Built-in editors for reports, pitch decks, and financial models with working formulas. Keep company collateral tied directly to your live product data.",
    track: "improvements",
    pillar: "Productivity Suite",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
  {
    id: "content-generation-pipelines",
    number: "23",
    title: "Content Generation Pipelines (Audio & Video)",
    subtitle: "Automated media workflows for product releases and marketing",
    description:
      "Convert product updates and release notes into structured podcasts, video summaries, and social assets through repeatable multi-modal pipelines.",
    track: "improvements",
    pillar: "Media Automation",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "honey",
  },
  {
    id: "native-voice-agents",
    number: "24",
    title: "Native Voice Agents",
    subtitle: "Real-time conversational audio for customer support and guidance",
    description:
      "Deploy voice interfaces capable of answering customer questions, walking users through onboarding steps, or accepting spoken workspace instructions.",
    track: "improvements",
    pillar: "Interaction & Voice",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "green",
  },
  {
    id: "shepherd-guidance",
    number: "25",
    title: "Shepherd Web Guidance Assistant",
    subtitle: "Step-by-step assistance through complex web workflows",
    description:
      "An in-browser guide that highlights actions, navigates complicated vendor dashboards, and guides you through technical setup tasks in real time.",
    track: "improvements",
    pillar: "In-App Guidance",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "clay",
  },
  {
    id: "computer-use",
    number: "26",
    title: "Computer Use & Remote System Integration",
    subtitle: "Safe browser actions, desktop automation, and external machine control",
    description:
      "Allow agents to interact with desktop applications and remote systems under strict safety bounds to perform repetitive operational tasks.",
    track: "improvements",
    pillar: "System Operations",
    status: "upcoming",
    statusLabel: "Upcoming",
    tint: "sage",
  },
];

export const ALL_ROADMAP_ITEMS: RoadmapItem[] = [
  ...ROADMAP_TRACK_STORY,
  ...ROADMAP_TRACK_IMPROVEMENTS,
];

export const ROADMAP_PAGE_COPY = {
  title: "What’s coming to the platform.",
  sub: "An honest look at what we’re building. First, the core operating foundation that makes products deployable and maintainable — followed by the creative suites and tools that expand what you can make.",
  trackStory: {
    title: "The Allr Story & Operating Foundation",
    eyebrow: "Part 1 · Core Platform",
    sub: "AI made creation abundant. The hard part is everything that keeps a product running — billing, domains, security, background intelligence, and maintenance. These tasks form the reusable operating layer under every product.",
    anchor: "foundation",
    count: ROADMAP_TRACK_STORY.length,
  },
  trackImprovements: {
    title: "Product Suites & Experience Improvements",
    eyebrow: "Part 2 · Authoring & Tooling",
    sub: "With the operating layer established, the creation tools expand. From refined web interfaces and visual design canvases to demo video editors and built-in office suites.",
    anchor: "improvements",
    count: ROADMAP_TRACK_IMPROVEMENTS.length,
  },
} as const;
