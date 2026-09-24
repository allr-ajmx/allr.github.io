/**
 * The workspace stamp's pure half: what a valid request looks like, and the
 * constant-time token check. No server imports, so tests exercise exactly
 * what production runs.
 */

import { timingSafeEqual } from "node:crypto";

export type WorkspaceStamp = {
  email: string;
  username: string | null;
  workspaceEmail: string | null;
  address: string | null;
};

export type StampParse =
  | { ok: true; stamp: WorkspaceStamp }
  | { ok: false; message: string };

export function parseStamp(body: unknown): StampParse {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email.includes("@")) return { ok: false, message: "email is required." };

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const username = str(b.username);
  const workspaceEmail = str(b.workspaceEmail ?? b.workspace_email);
  const address = str(b.address ?? b.workspace_address);

  const set = [username, workspaceEmail, address].filter(Boolean).length;
  if (set !== 0 && set !== 3) {
    return {
      ok: false,
      message: "Send username, workspaceEmail and address together, or none of them to clear.",
    };
  }
  if (address && !/^https:\/\//.test(address)) {
    return { ok: false, message: "address must be an https:// URL." };
  }
  return { ok: true, stamp: { email, username, workspaceEmail, address } };
}

/** True only for `Bearer <token>` matching a configured, non-trivial token. */
export function tokenMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32) return false;
  const [scheme, token] = (header ?? "").split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
