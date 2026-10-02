import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ApiError, badRequest } from "./errors";
import { parseStamp as parsePure, tokenMatches, type WorkspaceStamp } from "@/lib/admin/stamp";
import { initialLedgerFields } from "./credits";
import { enqueueOp } from "./provisioning";
import { shipLog } from "./logship";

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

  const db2 = adminDb();
  await db2.runTransaction(async (tx) => {
    tx.update(user.ref, {
      workspace_username: stamp.username,
      workspace_email: stamp.workspaceEmail,
      workspace_address: stamp.address,
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (stamp.username) {
      // The name is now real; a lingering pending value would let the next
      // monthly charge re-enqueue provisioning for a workspace that exists.
      tx.update(user.ref, { pending_workspace_username: null });
      // Claim the name so self-serve can never hand it out — this is how
      // manually provisioned workspaces become known to the site.
      tx.set(db2.collection("workspace_usernames").doc(stamp.username), {
        uid,
        email: stamp.email,
        reservedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      // Open the credit ledger once; never reset an existing one — and make
      // the key match it right away rather than trusting the minted default.
      if (!user.data()?.credits) {
        tx.update(user.ref, initialLedgerFields());
        enqueueOp(tx, {
          uid,
          email: stamp.email,
          username: stamp.username,
          op: "sync_limit",
          valueUsd: 0,
        });
      }
    }
  });

  const cleared = !stamp.username;
  console.log(
    `[admin] workspace ${cleared ? "cleared" : `set to ${stamp.username}`} for ${stamp.email} (${uid})`,
  );
  shipLog("orchestrator", cleared ? "workspace stamp cleared" : "workspace stamped", {
    email: stamp.email,
    username: stamp.username,
  });
  return { uid, cleared };
}
