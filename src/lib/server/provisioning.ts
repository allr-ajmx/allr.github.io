import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ApiError, badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { checkUsernameShape } from "@/lib/admin/username";

/**
 * Self-serve provisioning, the site's half.
 *
 * Paying is the gate: when a subscription turns active and the profile has no
 * workspace, the reserved username goes onto a queue, and a worker on the VPS
 * — polling outbound, never listening — turns queue entries into workspaces
 * and stamps the profile back through /api/admin/workspace.
 */

const USERS = "users";
/** One document per name, ever: the reservation ledger. */
const USERNAMES = "workspace_usernames";
/** One document per uid: at most one workspace per account, by construction. */
const QUEUE = "provision_queue";
/** Small imperatives for the VPS worker: set_limit today, suspend/resume next. */
const OPS = "workspace_ops";

export type QueueStatus = "queued" | "claimed" | "provisioned" | "failed";

export async function usernameAvailable(username: string): Promise<boolean> {
  const snap = await adminDb().collection(USERNAMES).doc(username).get();
  return !snap.exists;
}

/**
 * Reserve `username` for the caller — their previous reservation, if any, is
 * released in the same transaction, so switching names before paying never
 * strands a name nobody holds.
 */
export async function reserveUsername(caller: Caller, raw: unknown): Promise<string> {
  const verdict = checkUsernameShape(raw);
  if (!verdict.ok) throw badRequest("bad-username", verdict.reason);
  const username = verdict.username;

  const db = adminDb();
  const nameRef = db.collection(USERNAMES).doc(username);
  const userRef = db.collection(USERS).doc(caller.uid);

  await db.runTransaction(async (tx) => {
    const [name, user] = await Promise.all([tx.get(nameRef), tx.get(userRef)]);
    if (!user.exists) throw badRequest("no-profile", "Make an account first.");
    const held = user.data()?.pending_workspace_username as string | undefined;

    if (name.exists && name.data()?.uid !== caller.uid) {
      throw conflict("username-taken", "That name is taken. Try another?");
    }
    if (held && held !== username) tx.delete(db.collection(USERNAMES).doc(held));

    tx.set(nameRef, {
      uid: caller.uid,
      email: caller.email,
      reservedAt: FieldValue.serverTimestamp(),
    });
    tx.update(userRef, {
      pending_workspace_username: username,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return username;
}

/**
 * Put a paid account on the queue. Runs inside the webhook's transaction so
 * "payment recorded" and "provisioning queued" cannot come apart. Idempotent:
 * an entry that exists is left alone whatever its status.
 */
export function enqueueInTransaction(
  tx: FirebaseFirestore.Transaction,
  queueSnap: FirebaseFirestore.DocumentSnapshot,
  entry: { uid: string; email: string; username: string },
): void {
  if (queueSnap.exists) return;
  tx.set(queueSnap.ref, {
    ...entry,
    status: "queued" satisfies QueueStatus,
    error: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export const queueRef = (uid: string) => adminDb().collection(QUEUE).doc(uid);

/**
 * Hand the oldest queued entry to the worker, atomically. A crashed worker's
 * claim goes stale; claims older than an hour are offered again.
 */
export async function claimNext(): Promise<
  { uid: string; email: string; username: string } | null
> {
  const db = adminDb();
  const candidates = await db
    .collection(QUEUE)
    .where("status", "in", ["queued", "claimed"])
    .orderBy("createdAt")
    .limit(5)
    .get();

  for (const doc of candidates.docs) {
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      const data = fresh.data();
      if (!data) return false;
      const claimedAt = data.claimedAt?.toDate?.() as Date | undefined;
      const stale = claimedAt ? Date.now() - claimedAt.getTime() > 3_600_000 : true;
      if (data.status === "claimed" && !stale) return false;
      if (data.status !== "queued" && data.status !== "claimed") return false;
      tx.update(doc.ref, {
        status: "claimed" satisfies QueueStatus,
        claimedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (claimed) {
      const d = doc.data();
      return { uid: d.uid, email: d.email, username: d.username };
    }
  }
  return null;
}

/** The worker's verdict. Success leaves the stamp to /api/admin/workspace. */
export async function completeClaim(
  uid: string,
  ok: boolean,
  error?: string,
): Promise<void> {
  const ref = queueRef(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "no-entry", `Nothing queued for ${uid}.`);
  await ref.update({
    status: (ok ? "provisioned" : "failed") satisfies QueueStatus,
    error: ok ? null : (error ?? "unknown").slice(0, 500),
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (!ok) console.error(`[provision] ${uid} failed: ${error}`);
}

/** What the billing page shows while the container ship comes in. */
export async function readQueue(
  uid: string,
): Promise<{ status: QueueStatus; error: string | null } | null> {
  const snap = await queueRef(uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return { status: d.status, error: d.error ?? null };
}


// ---- the ops queue ------------------------------------------------------------

export type WorkspaceOp = {
  uid: string;
  email: string;
  username: string;
  op: "set_limit" | "suspend" | "resume";
  valueUsd: number;
};

/**
 * Queue an op inside a caller-owned transaction. Keyed by uid+op, so a burst
 * of changes collapses to the latest value — the worker applies the target,
 * not the history.
 */
export function enqueueOp(tx: FirebaseFirestore.Transaction, op: WorkspaceOp): void {
  const ref = adminDb().collection(OPS).doc(`${op.uid}:${op.op}`);
  tx.set(ref, {
    ...op,
    status: "queued",
    error: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function claimNextOp(): Promise<(WorkspaceOp & { id: string }) | null> {
  const db = adminDb();
  const candidates = await db
    .collection(OPS)
    .where("status", "in", ["queued", "claimed"])
    .orderBy("createdAt")
    .limit(5)
    .get();

  for (const doc of candidates.docs) {
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      const data = fresh.data();
      if (!data) return false;
      const claimedAt = data.claimedAt?.toDate?.() as Date | undefined;
      const stale = claimedAt ? Date.now() - claimedAt.getTime() > 900_000 : true;
      if (data.status === "claimed" && !stale) return false;
      if (data.status !== "queued" && data.status !== "claimed") return false;
      tx.update(doc.ref, {
        status: "claimed",
        claimedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (claimed) {
      const d = doc.data();
      return { id: doc.id, uid: d.uid, email: d.email, username: d.username, op: d.op, valueUsd: d.valueUsd };
    }
  }
  return null;
}

export async function completeOp(id: string, ok: boolean, error?: string): Promise<void> {
  const ref = adminDb().collection(OPS).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "no-op", `No op ${id}.`);
  await ref.update({
    status: ok ? "done" : "failed",
    error: ok ? null : (error ?? "unknown").slice(0, 500),
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (!ok) console.error(`[ops] ${id} failed: ${error}`);
}
