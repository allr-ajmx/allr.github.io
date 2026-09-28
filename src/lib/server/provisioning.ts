import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ApiError, badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { checkUsernameShape } from "@/lib/admin/username";
import { initialLedger as initialCreditLedger } from "@/lib/billing/credits";

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


/**
 * Connect a manually created workspace to its owner at sign-in.
 *
 * The roster (pushed by the VPS) is the memory of the manual era: when a
 * profile with no workspace signs in and a roster row carries their email,
 * the workspace is theirs — stamp it, claim the name, open the ledger.
 * Nothing to pay, nothing to pick; the trial stamps itself on the next read
 * like any provisioned workspace.
 */
export async function adoptFromRoster(
  uid: string,
  email: string,
): Promise<boolean> {
  const db = adminDb();
  const rows = await db
    .collection("workspace_roster")
    .where("email", "==", email.trim().toLowerCase())
    .limit(1)
    .get();
  const row = rows.docs[0]?.data();
  if (!row?.username) return false;

  const username = String(row.username);
  const userRef = db.collection(USERS).doc(uid);
  const nameRef = db.collection(USERNAMES).doc(username);

  await db.runTransaction(async (tx) => {
    const [user, name] = await Promise.all([tx.get(userRef), tx.get(nameRef)]);
    if (!user.exists) return;
    const d = user.data()!;
    if (String(d.workspace_username ?? "").trim()) return; // raced: already set
    if (name.exists && name.data()?.uid !== uid) return; // somebody else's name

    tx.update(userRef, {
      workspace_username: username,
      workspace_email: email,
      workspace_address: `https://${username}.allr.work`,
      pending_workspace_username: null,
      ...(d.credits ? {} : { credits: initialCreditLedger() }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(nameRef, { uid, email, reservedAt: FieldValue.serverTimestamp() }, { merge: true });
  });

  console.log(`[adopt] roster workspace ${username} connected to ${email} (${uid})`);
  return true;
}
