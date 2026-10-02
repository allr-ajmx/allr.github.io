import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { ApiError, badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { checkUsernameShape } from "@/lib/admin/username";
import { appliedLimit, initialLedger as initialCreditLedger, ledgerFromDoc, settle } from "@/lib/billing/credits";
import { shipLog } from "./logship";

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
  // No orderBy: status-in + createdAt ordering would demand a composite
  // index, and a missing index is a silent 500 in production. The queue
  // holds a handful of docs; oldest-first is settled in memory.
  const candidates = await db
    .collection(QUEUE)
    .where("status", "in", ["queued", "claimed"])
    .limit(20)
    .get();
  const ordered = [...candidates.docs].sort(
    (a, b) => (a.createTime?.toMillis() ?? 0) - (b.createTime?.toMillis() ?? 0),
  );

  for (const doc of ordered) {
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
  shipLog("orchestrator", ok ? "workspace provisioned" : "provisioning FAILED",
    { uid, error: ok ? undefined : error }, ok ? "info" : "error");
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
  /** sync_limit: bring the key's limit to the ledger (value resolved live). */
  op: "sync_limit" | "suspend" | "resume" | "remove" | "set_email";
  valueUsd: number;
};

/**
 * Queue an op inside a caller-owned transaction. Keyed by uid+op, so a burst
 * of changes collapses to the latest value — the worker applies the target,
 * not the history.
 */
export function enqueueOp(tx: FirebaseFirestore.Transaction, op: WorkspaceOp): void {
  // Account-less (roster-only) workspaces key by username instead of uid.
  const ref = adminDb().collection(OPS).doc(`${op.uid || `ws:${op.username}`}:${op.op}`);
  // `gen` bumps on every enqueue: a completion only closes the op if no newer
  // request arrived while the worker was applying the old one.
  tx.set(
    ref,
    {
      ...op,
      status: "queued",
      error: null,
      gen: FieldValue.increment(1),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function claimNextOp(): Promise<(WorkspaceOp & { id: string; gen: number }) | null> {
  const db = adminDb();
  // Index-free for the same reason as claimNext; see the note there.
  const candidates = await db
    .collection(OPS)
    .where("status", "in", ["queued", "claimed"])
    .limit(20)
    .get();
  const ordered = [...candidates.docs].sort(
    (a, b) => (a.createTime?.toMillis() ?? 0) - (b.createTime?.toMillis() ?? 0),
  );

  for (const doc of ordered) {
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
      const d = (await doc.ref.get()).data()!;
      return {
        id: doc.id,
        uid: d.uid,
        email: d.email,
        username: d.username,
        op: d.op,
        valueUsd: d.valueUsd,
        gen: Number(d.gen ?? 0),
      };
    }
  }
  return null;
}

export async function completeOp(
  id: string,
  ok: boolean,
  error?: string,
  claimedGen?: number,
): Promise<void> {
  const db = adminDb();
  const ref = db.collection(OPS).doc(id);
  const data0 = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "no-op", `No op ${id}.`);
    const d = snap.data()!;
    // A newer request arrived while this one was being applied: leave it
    // queued so the worker applies the latest state, instead of marking the
    // newer request done unseen.
    const superseded = claimedGen !== undefined && Number(d.gen ?? 0) !== claimedGen;
    tx.update(ref, {
      status: superseded ? "queued" : ok ? "done" : "failed",
      error: ok ? null : (error ?? "unknown").slice(0, 500),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return d;
  });
  shipLog("orchestrator", `op ${data0.op} ${ok ? "done" : "FAILED"}`,
    { target: data0.username || data0.email, error: ok ? undefined : error }, ok ? "info" : "error");
  if (!ok) {
    console.error(`[ops] ${id} failed: ${error}`);
    return;
  }
  // A completed resume lifts the enforcer's mark; the sweep would otherwise
  // keep asking. (An admin resume on an enforced account counts too — the
  // admin has spoken.)
  const data = data0;
  if (data.op === "resume") {
    const ref = await userRefForOp(null, String(data.uid ?? ""), String(data.username ?? ""));
    if (ref) {
      await ref.update({ enforcement: null, updatedAt: FieldValue.serverTimestamp() });
    }
  }
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
  shipLog("orchestrator", "roster workspace adopted at sign-in", { email, username });
  return true;
}


/**
 * The user doc an op refers to. Ops carry the uid they were queued under,
 * but an account can move to a new uid (email transfer, stranded-identity
 * adoption); the workspace name is the stable key, so fall back to it.
 */
async function userRefForOp(
  tx: FirebaseFirestore.Transaction | null,
  uid: string,
  username: string,
): Promise<FirebaseFirestore.DocumentReference | null> {
  const db = adminDb();
  if (uid) {
    const ref = db.collection(USERS).doc(uid);
    const snap = tx ? await tx.get(ref) : await ref.get();
    if (snap.exists) return ref;
  }
  if (!username) return null;
  const q = db.collection(USERS).where("workspace_username", "==", username).limit(1);
  const hits = tx ? await tx.get(q) : await q.get();
  return hits.docs[0]?.ref ?? null;
}

/**
 * sync_limit, step 2 of 3: the worker has read LIVE usage from OpenRouter.
 * Settle any pending monthly grant against it, persist, and return the limit
 * the key must hold. Idempotent: a retry after a failed key update settles
 * nothing new and returns the same limit.
 */
export async function resolveLimit(
  opId: string,
  liveUsageUsd: number,
): Promise<{ limitUsd: number }> {
  if (!Number.isFinite(liveUsageUsd) || liveUsageUsd < 0) {
    throw new ApiError(400, "invalid", "usageUsd must be a non-negative number.");
  }
  const db = adminDb();
  const opRef = db.collection(OPS).doc(opId);
  return db.runTransaction(async (tx) => {
    const op = await tx.get(opRef);
    if (!op.exists || op.data()?.op !== "sync_limit") {
      throw new ApiError(404, "no-op", `No sync_limit op ${opId}.`);
    }
    const userRef = await userRefForOp(tx, String(op.data()!.uid ?? ""), String(op.data()!.username ?? ""));
    if (!userRef) throw new ApiError(400, "no-account", "This workspace has no account or ledger.");
    const user = await tx.get(userRef);
    const raw = user.data()?.credits;
    if (!raw) throw new ApiError(400, "no-ledger", "No credit ledger for this account.");
    const ledger = settle(ledgerFromDoc(raw)!, liveUsageUsd, new Date());
    tx.update(userRef, {
      credits: { ...ledger, usageSyncedAt: new Date().toISOString() },
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { limitUsd: appliedLimit(ledger, liveUsageUsd) };
  });
}
