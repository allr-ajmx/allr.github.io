import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { enqueueInTransaction, enqueueOp, queueRef } from "./provisioning";
import { stopBillingForRemoval } from "./billing";
import { shipLog } from "./logship";
import { ledgerFromDoc, queueChange, type PendingChange } from "@/lib/billing/credits";
import {
  ActionRefused,
  parseAction as parsePure,
  type AdminAction,
} from "@/lib/admin/parse-action";

/**
 * What an admin may do to a customer. Every action is a server write into
 * the same ledgers and queues the automatic paths use — the panel has no
 * powers of its own, only a hand on the same levers — and each one is
 * recorded in `admin_actions` with who pulled it.
 *
 * Validation lives here, not in the browser: a crafted request gets exactly
 * the same refusals the UI shows.
 */

const USERS = "users";
const EMAIL_CLAIMS = "user_emails";

const emailKey = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export type { AdminAction } from "@/lib/admin/parse-action";

export function parseAction(body: unknown): AdminAction {
  try {
    return parsePure(body);
  } catch (e) {
    if (e instanceof ActionRefused) throw badRequest(e.code, e.message);
    throw e;
  }
}

function audit(
  tx: FirebaseFirestore.Transaction,
  admin: Caller,
  action: AdminAction,
  detail: string | number | null,
) {
  tx.set(adminDb().collection("admin_actions").doc(), {
    by: admin.email,
    uid: "uid" in action ? action.uid : null,
    username: "username" in action ? action.username : null,
    action: action.action,
    detail,
    at: FieldValue.serverTimestamp(),
  });
}

/** Roster-only workspaces: the roster row is the identity; ops carry no uid. */
async function applyRosterAction(
  admin: Caller,
  action: Extract<AdminAction, { username: string; action: `ws_${string}` }>,
) {
  const db = adminDb();
  const rosterRef = db.collection("workspace_roster").doc(action.username);
  await db.runTransaction(async (tx) => {
    const roster = await tx.get(rosterRef);
    if (!roster.exists) throw badRequest("no-workspace", "No such workspace on the roster.");
    const current = String(roster.data()?.email ?? "");
    if (action.action === "ws_set_email") {
      if (action.email === current) throw badRequest("invalid", "That is already its email.");
      // The VPS owns the truth (USER_EMAIL, SSO login); the roster mirrors it
      // now so the table — and sign-in adoption by that email — follow at once.
      enqueueOp(tx, { uid: "", email: action.email, username: action.username, op: "set_email", valueUsd: 0 });
      tx.update(rosterRef, { email: action.email, updatedAt: FieldValue.serverTimestamp() });
      audit(tx, admin, action, `${current} → ${action.email}`);
      return;
    }
    const op =
      action.action === "ws_suspend" ? "suspend" : action.action === "ws_resume" ? "resume" : "remove";
    enqueueOp(tx, { uid: "", email: current, username: action.username, op, valueUsd: 0 });
    audit(tx, admin, action, null);
  });
  shipLog("admin", action.action, { by: admin.email, target: action.username },
    action.action === "ws_remove" ? "warn" : "info");
}

export async function applyAdminAction(admin: Caller, action: AdminAction): Promise<void> {
  if (action.action.startsWith("ws_")) {
    return applyRosterAction(admin, action as Extract<AdminAction, { action: `ws_${string}` }>);
  }
  const a = action as Exclude<AdminAction, { action: `ws_${string}` }>;
  const db = adminDb();
  const userRef = db.collection(USERS).doc(a.uid);
  let oldEmailForAuth: string | null = null;

  // Remove, step 1: stop billing FIRST. If Razorpay refuses, we throw here and
  // nothing is deleted; the reverse order could leave a deleted workspace that
  // is still being charged.
  let billingDetail = "";
  if (a.action === "remove") {
    const pre = (await userRef.get()).data();
    const username = String(pre?.workspace_username ?? "");
    if (!pre) throw badRequest("no-account", "No such customer.");
    if (!username) throw badRequest("no-workspace", "There is no workspace to remove.");
    if (a.confirm !== username) {
      throw badRequest("confirm", `Name the workspace (${username}) exactly to confirm removal.`);
    }
    billingDetail = await stopBillingForRemoval(a.uid, a.refund);
  }

  await db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    if (!user.exists) throw badRequest("no-account", "No such customer.");
    const d = user.data()!;
    const username = String(d.workspace_username ?? "");

    const queueCredit = (change: PendingChange) => {
      if (!username) throw badRequest("no-workspace", "Credits belong to a live workspace.");
      const ledger = ledgerFromDoc(d.credits);
      if (!ledger) throw badRequest("no-ledger", "This account has no credit ledger yet.");
      tx.update(userRef, { credits: queueChange(ledger, change), updatedAt: FieldValue.serverTimestamp() });
      enqueueOp(tx, { uid: a.uid, email: d.email, username, op: "sync_limit", valueUsd: 0 });
    };

    switch (a.action) {
      case "edit_profile": {
        tx.update(userRef, {
          ...(a.name !== undefined ? { name: a.name } : {}),
          ...(a.country !== undefined ? { country: a.country } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        audit(tx, admin, a, [a.name, a.country].filter(Boolean).join(" · "));
        break;
      }
      case "transfer_email": {
        const oldEmail = String(d.email ?? "").toLowerCase();
        if (a.email === oldEmail) throw badRequest("invalid", "That is already their email.");
        const oldClaim = db.collection(EMAIL_CLAIMS).doc(emailKey(oldEmail));
        const newClaim = db.collection(EMAIL_CLAIMS).doc(emailKey(a.email));
        const taken = await tx.get(newClaim);
        if (taken.exists && taken.data()?.uid !== a.uid) {
          throw conflict("email-taken", "Another Allr account already uses that email.");
        }
        tx.update(userRef, {
          email: a.email,
          ...(username ? { workspace_email: a.email } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.delete(oldClaim);
        tx.set(newClaim, { uid: a.uid, email: a.email, transferredAt: FieldValue.serverTimestamp() });
        if (username) {
          enqueueOp(tx, { uid: a.uid, email: a.email, username, op: "set_email", valueUsd: 0 });
        }
        audit(tx, admin, a, `${oldEmail} → ${a.email}`);
        oldEmailForAuth = oldEmail;
        break;
      }
      case "grant_credit":
        queueCredit({
          type: "grant",
          grant: { id: randomUUID().slice(0, 8), usd: a.usd, expiresAt: a.expiresAt, note: a.note || undefined },
        });
        audit(tx, admin, a, `$${a.usd}${a.expiresAt ? ` until ${a.expiresAt.slice(0, 10)}` : ""}`);
        break;
      case "revoke_grant":
        queueCredit({ type: "revoke", id: a.grantId });
        audit(tx, admin, a, a.grantId);
        break;
      case "set_included":
        queueCredit({ type: "set_included", usd: a.usd });
        audit(tx, admin, a, a.usd);
        break;
      case "suspend":
      case "resume":
        if (!username) throw badRequest("no-workspace", "There is no workspace to act on.");
        enqueueOp(tx, { uid: a.uid, email: d.email, username, op: a.action, valueUsd: 0 });
        audit(tx, admin, a, null);
        break;
      case "remove":
        if (!username) throw badRequest("no-workspace", "There is no workspace to remove.");
        // Checked here, where a creative client cannot skip it.
        if (a.confirm !== username) {
          throw badRequest("confirm", `Name the workspace (${username}) exactly to confirm removal.`);
        }
        enqueueOp(tx, { uid: a.uid, email: d.email, username, op: "remove", valueUsd: 0 });
        audit(tx, admin, a, `${username} · ${billingDetail}`);
        break;
      case "provision": {
        if (username) throw conflict("has-workspace", "They already have a workspace.");
        const [queueSnap, nameSnap] = await Promise.all([
          tx.get(queueRef(a.uid)),
          tx.get(db.collection("workspace_usernames").doc(a.username)),
        ]);
        if (nameSnap.exists && nameSnap.data()?.uid !== a.uid) {
          throw conflict("username-taken", "That name is taken.");
        }
        tx.set(nameSnap.ref, { uid: a.uid, email: d.email, reservedAt: FieldValue.serverTimestamp() });
        tx.update(userRef, { pending_workspace_username: a.username, updatedAt: FieldValue.serverTimestamp() });
        enqueueInTransaction(tx, queueSnap, { uid: a.uid, email: d.email, username: a.username });
        audit(tx, admin, a, a.username);
        break;
      }
    }
  });

  // Transfer, step 2: retire the old Google identity. The next sign-in with
  // the new address finds the claim pointing at a uid Auth no longer knows,
  // and readOrAdoptProfile moves the whole account to that person.
  if (oldEmailForAuth) {
    try {
      await adminAuth().deleteUser(a.uid);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== "auth/user-not-found") throw e;
    }
  }

  console.log(`[admin] ${admin.email}: ${a.action} for ${a.uid}`);
  shipLog("admin", a.action, { by: admin.email, target: a.uid },
    a.action === "remove" || a.action === "transfer_email" ? "warn" : "info");
}
