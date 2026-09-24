/**
 * Workspace usernames, the pure rules. The stricter authority is
 * allr.os/scripts/add-db.sh — this mirrors it (plus web-facing names the
 * platform serves under) so a name the site accepts is a name the VPS will.
 */

export const USERNAME_RE = /^[a-z][a-z0-9]{0,30}$/;

/** Hosts the platform itself answers on, plus web housekeeping names. */
export const RESERVED_USERNAMES = new Set([
  "app", "auth", "authenticate", "pgadmin", "admin",
  "www", "api", "mail", "smtp", "ns1", "ns2", "portal", "status",
]);

export type UsernameVerdict =
  | { ok: true; username: string }
  | { ok: false; reason: string };

export function checkUsernameShape(raw: unknown): UsernameVerdict {
  const username = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!username) return { ok: false, reason: "Pick a name for your workspace." };
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      reason: "Letters and digits only, starting with a letter — up to 31 characters.",
    };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, reason: "That name is taken." };
  }
  return { ok: true, username };
}
