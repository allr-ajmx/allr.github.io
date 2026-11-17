import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { badRequest, toResponse } from "@/lib/server/errors";
import { requireAdminToken } from "@/lib/server/workspace-admin";
import { ingestUsage } from "@/lib/server/credits";

/**
 * The worker's roster push: every workspace on the host, site account or not,
 * with its platform telemetry (suspension, versions, key state). Items that
 * carry usage also feed the credit meters — one outbound call from the VPS
 * covers both.
 */

type RosterItem = {
  username: string;
  email: string;
  suspended?: boolean;
  agentTag?: string;
  helixTag?: string;
  orManaged?: boolean;
  orDisabled?: boolean;
  orLimitUsd?: number;
  orUsageUsd?: number;
  orUsageDailyUsd?: number;
  orUsageMonthlyUsd?: number;
  orHealth?: string;
};
/** A row unchanged for this long is rewritten anyway, so "seen" stays honest. */
const HEARTBEAT_MS = 30 * 60_000;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function rosterFields(username: string, item: RosterItem) {
  return {
    username,
    email: item.email.trim().toLowerCase(),
    suspended: Boolean(item.suspended),
    agentTag: item.agentTag ?? null,
    helixTag: item.helixTag ?? null,
    orManaged: item.orManaged ?? null,
    orDisabled: item.orDisabled ?? null,
    orLimitUsd: num(item.orLimitUsd),
    orUsageUsd: num(item.orUsageUsd),
    orUsageDailyUsd: num(item.orUsageDailyUsd),
    orUsageMonthlyUsd: num(item.orUsageMonthlyUsd),
    orHealth: typeof item.orHealth === "string" ? item.orHealth.slice(0, 300) : null,
  };
}

function sameFields(prev: FirebaseFirestore.DocumentData, next: ReturnType<typeof rosterFields>) {
  return (Object.keys(next) as (keyof typeof next)[]).every((k) => (prev[k] ?? null) === next[k]);
}

function fresh(updatedAt: unknown, now: number) {
  const ms = (updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.();
  return typeof ms === "number" && now - ms < HEARTBEAT_MS;
}

export async function POST(request: Request) {
  try {
    requireAdminToken(request);
    const body = (await request.json().catch(() => null)) as {
      items?: RosterItem[];
      complete?: boolean;
    } | null;
    if (!Array.isArray(body?.items)) throw badRequest("invalid", "Send {items: […]}.");

    const db = adminDb();
    const items = body.items.slice(0, 200);
    // Only a complete list can prove absence. The worker now sends just the
    // rows that changed between hourly full pushes and says which it is;
    // a push without the flag (an older worker) is the whole fleet, as before.
    // Past the 200-item cap no list is complete.
    const complete = (typeof body.complete === "boolean" ? body.complete : true) && body.items.length <= 200;
    // One read pass. A complete push reads the whole (small) collection once —
    // it needs every row for the absence check anyway; a capped push reads
    // only the rows it names.
    const existing = new Map<string, FirebaseFirestore.DocumentData>();
    if (complete) {
      const all = await db.collection("workspace_roster").get();
      for (const d of all.docs) existing.set(d.id, d.data());
    } else {
      const refs = items
        .filter((i) => typeof i?.username === "string" && i.username.trim())
        .map((i) => db.collection("workspace_roster").doc(i.username.trim().toLowerCase()));
      const snaps = refs.length ? await db.getAll(...refs) : [];
      for (const d of snaps) if (d.exists) existing.set(d.id, d.data()!);
    }

    const batch = db.batch();
    let writes = 0;
    const seen: string[] = [];
    const now = Date.now();
    for (const item of items) {
      if (typeof item?.username !== "string" || typeof item?.email !== "string") continue;
      const username = item.username.trim().toLowerCase();
      if (!username) continue;
      seen.push(username);
      const fields = rosterFields(username, item);
      const prev = existing.get(username);
      // The worker pushes every few minutes; rewriting identical rows each time
      // is what exhausted the Firestore quota. Write on change, plus a
      // heartbeat so `updatedAt` ("seen") never goes more than ~30 min stale.
      if (prev && !prev.gone && sameFields(prev, fields) && fresh(prev.updatedAt, now)) continue;
      batch.set(
        db.collection("workspace_roster").doc(username),
        {
          ...fields,
          gone: false,
          // Manual-era workspaces have no trustworthy creation date: the first
          // time the roster sees one, that day becomes its date — once, never moved.
          ...(prev?.firstSeenAt ? {} : { firstSeenAt: FieldValue.serverTimestamp() }),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      writes++;
    }
    // The push is the VPS's whole fleet: a row it no longer lists was removed
    // there. Marked, not deleted — one odd push must not erase history, and
    // the next push that lists it again brings it back.
    if (seen.length && complete) {
      const listed = new Set(seen);
      for (const [id, data] of existing) {
        if (!listed.has(id) && !data.gone) {
          batch.update(db.collection("workspace_roster").doc(id), { gone: true, goneAt: FieldValue.serverTimestamp() });
          writes++;
        }
      }
    }
    if (writes) await batch.commit();
    // Usage riding along feeds the same meters the dedicated push does.
    const withUsage = body.items.filter(
      (i) => Number.isFinite(i?.orUsageUsd) && typeof i?.email === "string",
    );
    const metered = withUsage.length
      ? await ingestUsage(withUsage.map((i) => ({ email: i.email, usageUsd: i.orUsageUsd!, username: i.username.trim().toLowerCase() })))
      : 0;
    return Response.json({ applied: seen.length, written: writes, metered });
  } catch (error) {
    return toResponse(error);
  }
}
