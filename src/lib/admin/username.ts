/**
 * Workspace usernames, the pure shape rule — safe for the browser. The
 * stricter authority is allr.os/scripts/add-db.sh; this mirrors it so a name
 * the site accepts is a name the VPS will. Reserved names are refused on the
 * server only (./reserved-usernames.ts), so the list never reaches a browser.
 */

export const USERNAME_RE = /^[a-z][a-z0-9]{0,30}$/;

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
  return { ok: true, username };
}
