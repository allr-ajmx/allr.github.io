import "server-only";

import { forbidden } from "./errors";
import { requireUser, type Caller } from "./session";

/**
 * Who may see other people's data.
 *
 * The allowlist lives in ALLR_ADMIN_UI_EMAILS (comma-separated, on Vercel) —
 * unset means *nobody*, so a misconfigured deployment fails closed. The email
 * checked is the one off the verified Google token, never anything the client
 * claims about itself: `isAdmin` in the UI is a convenience flag derived from
 * this same check, and forging it buys a prettier 403 page at most.
 */

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ALLR_ADMIN_UI_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@")),
  );
}

export const isAdminEmail = (email: string): boolean =>
  adminEmails().has(email.trim().toLowerCase());

export async function requireAdminUser(request: Request): Promise<Caller> {
  const caller = await requireUser(request);
  if (!isAdminEmail(caller.email)) {
    throw forbidden("not-admin", "This page is for Allr admins.");
  }
  return caller;
}
