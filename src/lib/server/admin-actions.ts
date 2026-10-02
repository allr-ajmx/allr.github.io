import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { enqueueInTransaction, enqueueOp, queueRef } from "./provisioning";
import { checkUsernameShape } from "@/lib/admin/username";
import { shipLog } from "./logship";
import {
  applyTopup,
  initialLedger,
  setIncluded,
  type CreditLedger,
} from "@/lib/billing/credits";

/**
 * What an admin may do to a customer's offering. Every action is a server
 * write into the same ledgers and queues the automatic paths use — the admin
 * panel has no powers of its own, only a hand on the same levers. Each one
 * is recorded in `admin_actions` with who pulled it.
 */

const USERS = "users";

const asLedger = (d: FirebaseFirestore.DocumentData): CreditLedger =>
  d.credits
    ? {
        includedUsd: Number(d.credits.includedUsd ?? 20),
        cycleStartUsageUsd: Number(d.credits.cycleStartUsageUsd ?? 0),
        topupBalanceUsd: Number(d.credits.topupBalanceUsd ?? 0),
        targetLimitUsd: Number(d.credits.targetLimitUsd ?? 20),
        usageUsd: Number(d.credits.usageUsd ?? 0),
        usageSyncedAt: d.credits.usageSyncedAt ?? null,
      }
    : initialLedger();

export type AdminAction =
  | { action: "grant_credit"; uid: string; usd: number }
  | { action: "set_included"; uid: string; usd: number }
  | { action: "suspend" | "resume"; uid: string }
  | { action: "provision"; uid: string; username: string }
  /** Destructive: containers and data. `confirm` must equal the username. */
  | { action: "remove"; uid: string; confirm: string }
  /** Roster-only workspaces (no site account yet): keyed by username. */
  | { action: "ws_suspend"; username: string }
  | { action: "ws_resume"; username: string }
  | { action: "ws_remove"; username: string; confirm: string };

export function parseAction(body: unknown): AdminAction {
  const b = (body ?? {}) as Record<string, unknown>;
  // Roster-only targets carry a username and no uid.
  if (b.action === "ws_suspend" || b.action === "ws_resume" || b.action === "ws_remove") {
    const verdict = checkUsernameShape(b.username);
    if (!verdict.ok) throw badRequest("bad-username", verdict.reason);
    if (b.action === "ws_remove") {
      if (typeof b.confirm !== "string" || b.confirm.trim().toLowerCase() !== verdict.username) {
        throw badRequest("confirm", "Name the workspace exactly to confirm removal.");
      }
      return { action: "ws_remove", username: verdict.username, confirm: verdict.username };
    }
    return b.action === "ws_suspend"
      ? { action: "ws_suspend", username: verdict.username }
      : { action: "ws_resume", username: verdict.username };
  }
  const uid = typeof b.uid === "string" ? b.uid : "";
  if (!uid) throw badRequest("invalid", "uid is required.");
  const usd = Number(b.usd);
  switch (b.action) {
    case "grant_credit":
      if (!Number.isFinite(usd) || usd <= 0 || usd > 500) {
        throw badRequest("invalid", "Grant between $0 and $500.");
      }
      return { action: "grant_credit", uid, usd };
    case "set_included":
      if (!Number.isFinite(usd) || usd < 0 || usd > 500) {
        throw badRequest("invalid", "Included is $0–$500 a month.");
      }
      return { action: "set_included", uid, usd };
    case "suspend":
    case "resume":
      return { action: b.action, uid };
    case "remove":
      if (typeof b.confirm !== "string" || !b.confirm.trim()) {
        throw badRequest("confirm", "Type the workspace name to confirm removal.");
      }
      return { action: "remove", uid, confirm: b.confirm.trim().toLowerCase() };
    case "provision": {
      const verdict = checkUsernameShape(b.username);
      if (!verdict.ok) throw badRequest("bad-username", verdict.reason);
      return { action: "provision", uid, username: verdict.username };
    }
    default:
      throw badRequest("invalid", "Unknown action.");
  }
}

export async function applyAdminAction(admin: Caller, action: AdminAction): Promise<void> {
  const db = adminDb();

  // Roster-only workspaces: the roster row is the identity; ops carry no uid.
  if (action.action === "ws_suspend" || action.action === "ws_resume" || action.action === "ws_remove") {
    const roster = await db.collection("workspace_roster").doc(action.username).get();
    if (!roster.exists) throw badRequest("no-workspace", "No such workspace on the roster.");
    const email = String(roster.data()?.email ?? "");
    const op = action.action === "ws_suspend" ? "suspend" : action.action === "ws_resume" ? "resume" : "remove";
    await db.runTransaction(async (tx) => {
      enqueueOp(tx, { uid: "", email, username: action.username, op, valueUsd: 0 });
      tx.set(db.collection("admin_actions").doc(), {
        by: admin.email,
        uid: null,
        username: action.username,
        action: action.action,
        detail: null,
        at: FieldValue.serverTimestamp(),
      });
    });
    console.log(`[admin] ${admin.email}: ${action.action} for roster workspace ${action.username}`);
    shipLog("admin", action.action, { by: admin.email, target: action.username },
      action.action === "ws_remove" ? "warn" : "info");
    return;
  }

  const userRef = db.collection(USERS).doc(action.uid);

  await db.runTransaction(async (tx) => {
    const reads: Promise<FirebaseFirestore.DocumentSnapshot>[] = [tx.get(userRef)];
    if (action.action === "provision") {
      reads.push(tx.get(queueRef(action.uid)));
      reads.push(tx.get(db.collection("workspace_usernames").doc(action.username)));
    }
    const [user, queueSnap, nameSnap] = await Promise.all(reads);
    if (!user.exists) throw badRequest("no-account", "No such customer.");
    const d = user.data()!;
    const username = String(d.workspace_username ?? "");

    switch (action.action) {
      case "grant_credit": {
        if (!username) throw badRequest("no-workspace", "Grant credit once a workspace exists.");
        const next = applyTopup(asLedger(d), action.usd);
        tx.update(userRef, { credits: next, updatedAt: FieldValue.serverTimestamp() });
        enqueueOp(tx, { uid: action.uid, email: d.email, username, op: "set_limit", valueUsd: next.targetLimitUsd });
        break;
      }
      case "set_included": {
        if (!username) throw badRequest("no-workspace", "Set the grant once a workspace exists.");
        const next = setIncluded(asLedger(d), action.usd);
        tx.update(userRef, { credits: next, updatedAt: FieldValue.serverTimestamp() });
        enqueueOp(tx, { uid: action.uid, email: d.email, username, op: "set_limit", valueUsd: next.targetLimitUsd });
        break;
      }
      case "suspend":
      case "resume": {
        if (!username) throw badRequest("no-workspace", "There is no workspace to act on.");
        enqueueOp(tx, { uid: action.uid, email: d.email, username, op: action.action, valueUsd: 0 });
        break;
      }
      case "remove": {
        if (!username) throw badRequest("no-workspace", "There is no workspace to remove.");
        // The confirmation is checked here, where it cannot be skipped by a
        // creative client — the typed name must match the workspace exactly.
        if (action.confirm !== username) {
          throw badRequest(
            "confirm",
            `Type the workspace name (${username}) exactly to confirm removal.`,
          );
        }
        enqueueOp(tx, { uid: action.uid, email: d.email, username, op: "remove", valueUsd: 0 });
        break;
      }
      case "provision": {
        if (username) throw conflict("has-workspace", "They already have a workspace.");
        if (nameSnap!.exists && nameSnap!.data()?.uid !== action.uid) {
          throw conflict("username-taken", "That name is taken.");
        }
        tx.set(nameSnap!.ref, { uid: action.uid, email: d.email, reservedAt: FieldValue.serverTimestamp() });
        tx.update(userRef, { pending_workspace_username: action.username, updatedAt: FieldValue.serverTimestamp() });
        enqueueInTransaction(tx, queueSnap!, { uid: action.uid, email: d.email, username: action.username });
        break;
      }
    }

    tx.set(db.collection("admin_actions").doc(), {
      by: admin.email,
      uid: action.uid,
      action: action.action,
      detail: "usd" in action ? action.usd : "username" in action ? action.username : null,
      at: FieldValue.serverTimestamp(),
    });
  });

  console.log(`[admin] ${admin.email}: ${action.action} for ${action.uid}`);
  shipLog("admin", action.action, {
    by: admin.email,
    target: action.uid,
    detail: "usd" in action ? action.usd : "username" in action ? action.username : undefined,
  }, action.action === "remove" ? "warn" : "info");
}
