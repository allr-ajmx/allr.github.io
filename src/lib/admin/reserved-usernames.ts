import { checkUsernameShape, type UsernameVerdict } from "./username.ts";

/**
 * Workspace usernames nobody can take: the hosts the platform serves under
 * the domain, and the names the company itself needs (ceo, support, billing,
 * postmaster, …) or that would mislead. A username becomes <name>.allr.work.
 *
 * SERVER ONLY. Never import this from a client component: the list would ship
 * in the browser bundle and name the internal services. The browser checks a
 * name's shape; the server (the availability check, the reservation, admin
 * provisioning) refuses these as "taken".
 *
 * Identical to allr.os/provisioner/allr_provisioner/reserved_usernames.txt,
 * which the VPS provisioner and scripts/add-user.sh read; the tests compare
 * the two when that repo sits beside this one. Change both together.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Hosts the platform serves under <DOMAIN>, and web housekeeping
  "app", "auth", "authenticate", "admin", "pgadmin", "portal", "status", "www", "api", "mail",
  "smtp", "ns1", "ns2", "dev",
  // Leadership and people
  "ceo", "cto", "cfo", "coo", "cmo", "cpo", "cso", "founder", "founders", "cofounder", "board",
  "team", "staff", "hr", "people", "careers", "jobs", "hiring", "recruiting",
  // Legal and trust
  "legal", "privacy", "terms", "security", "trust", "compliance", "gdpr", "dpo", "abuse", "spam",
  "report",
  // Money
  "billing", "payments", "payment", "invoice", "invoices", "finance", "accounts", "accounting",
  "tax", "refunds",
  // Sales, marketing, partners
  "sales", "marketing", "press", "media", "pr", "brand", "partners", "partner", "affiliates",
  "investors", "ir",
  // Support and contact
  "support", "help", "helpdesk", "contact", "hello", "info", "feedback", "community", "forum",
  "office", "ops", "operations",
  // Mail standards (RFC 2142 role addresses and mail-client discovery)
  "postmaster", "hostmaster", "webmaster", "noreply", "donotreply", "mailer", "mailerdaemon",
  "root", "administrator", "sysadmin", "email", "webmail", "imap", "pop", "pop3", "mx",
  "autodiscover", "autoconfig", "ns", "ns3", "ns4", "dns",
  // Infrastructure
  "apis", "gateway", "cdn", "static", "assets", "img", "images", "files", "uploads", "download",
  "downloads", "storage", "s3", "backup", "backups", "db", "database", "postgres", "mysql",
  "redis", "cache", "queue", "worker", "workers", "cron", "vpn", "netbird", "proxy", "edge", "lb",
  "node", "server", "host", "cloud", "internal", "intranet", "corp",
  // Engineering and monitoring
  "git", "gitlab", "github", "ci", "build", "deploy", "registry", "docker", "k8s", "monitor",
  "monitoring", "metrics", "grafana", "prometheus", "loki", "logs", "jaeger", "tracing", "sentry",
  "analytics", "stats", "health", "uptime",
  // Sign-in and consoles
  "sso", "oauth", "login", "signin", "signup", "register", "account", "id", "identity", "secure",
  "verify", "dashboard", "console", "panel", "control", "manage", "manager", "system", "sys",
  // Environments
  "test", "testing", "staging", "stage", "prod", "production", "demo", "sandbox", "preview",
  "beta", "alpha", "canary", "local", "localhost",
  // Public pages
  "docs", "doc", "developer", "developers", "blog", "news", "shop", "store", "pricing", "release",
  "releases", "changelog", "updates",
  // Protocols
  "webhook", "webhooks", "hooks", "callback", "socket", "ws", "wss", "rtc", "turn", "stun", "ftp",
  "sftp", "ssh",
  // Brand and product
  "allr", "allrwork", "allros", "helix", "hermes", "agent", "agents", "workspace", "workspaces",
  "official",
  // Generic or misleading
  "null", "undefined", "none", "nobody", "everyone", "all", "user", "users", "guest", "anonymous",
  "owner", "moderator", "mod", "example",
]);

/** Shape plus the reserved list: what may become a NEW workspace. */
export function checkWorkspaceName(raw: unknown): UsernameVerdict {
  const verdict = checkUsernameShape(raw);
  if (verdict.ok && RESERVED_USERNAMES.has(verdict.username)) {
    return { ok: false, reason: "That name is taken." };
  }
  return verdict;
}
