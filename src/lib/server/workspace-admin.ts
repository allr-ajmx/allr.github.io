import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ApiError, badRequest } from "./errors";
import { parseStamp as parsePure, tokenMatches, type WorkspaceStamp } from "@/lib/admin/stamp";

/**
 * The one door through which workspaces reach profiles.
 *
 * The provisioner on the VPS creates and removes workspaces; this module is
 * how the website hears about it. It is deliberately narrow: given an email,
 * set or clear the three workspace_* fields — nothing else on the profile is
 * reachable through it, so the token that guards it is worth exactly that
 * much and no more.
 */

const USERS = "users";
const EMAIL_CLAIMS = "user_emails";

const emailKey = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

/** Constant-time bearer check against ALLR_ADMIN_API_TOKEN. */
export function requireAdminToken(request: Request): void {
  const expected = process.env.ALLR_ADMIN_API_TOKEN;
  if (!expected || expected.length < 32) {
    // Refusing to run with a weak or missing token beats running open.
    throw new ApiError(503, "admin-unconfigured", "The admin API is not set up.");
  }
  if (!tokenMatches(request.headers.get("authorization"), expected)) {
    throw new ApiError(401, "unauthorized", "Bad admin token.");
  }
}

export function parseStamp(body: unknown): WorkspaceStamp {
  const parsed = parsePure(body);
  if (!parsed.ok) throw badRequest("invalid", parsed.message);
  return parsed.stamp;
}

/**
 * Apply the stamp. Setting all three opens billing and starts the trial on
 * next read; clearing them closes billing again. Billing state itself is
 * never touched here — a suspended workspace with a live subscription is a
 * question for a person, not for this endpoint.
 */
export async function stampWorkspace(stamp: WorkspaceStamp): Promise<{
  uid: string;
  cleared: boolean;
}> {
  const db = adminDb();
  const claim = await db.collection(EMAIL_CLAIMS).doc(emailKey(stamp.email)).get();
  const uid = claim.data()?.uid as string | undefined;
  if (!uid) {
    throw new ApiError(404, "no-account", `No Allr account for ${stamp.email}.`);
  }
  const user = await db.collection(USERS).doc(uid).get();
  if (!user.exists) {
    throw new ApiError(404, "no-account", `No profile behind ${stamp.email}.`);
  }

  await user.ref.update({
    workspace_username: stamp.username,
    workspace_email: stamp.workspaceEmail,
    workspace_address: stamp.address,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const cleared = !stamp.username;
  console.log(
    `[admin] workspace ${cleared ? "cleared" : `set to ${stamp.username}`} for ${stamp.email} (${uid})`,
  );
  return { uid, cleared };
}
