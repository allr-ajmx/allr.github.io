import { Timestamp } from "firebase-admin/firestore";
import { billingFromDoc, compFromDoc } from "@/lib/billing/records";
import { adminDb } from "@/lib/server/admin";
import { requireAdminUser } from "@/lib/server/admin-gate";
import { toResponse } from "@/lib/server/errors";
import { deriveState } from "@/lib/account/state";
import { consistencyIssues } from "@/lib/admin/consistency";
import { removalDate } from "@/lib/billing/lifecycle";
import { ledgerFromDoc, remaining, spentThisCycle } from "@/lib/billing/credits";
import type { UserProfile } from "@/lib/account/model";

/**
 * Everything an admin needs to see about the customers, in one read-only
 * list. Signed-in + allowlisted only (admin-gate); the machine-token
 * /api/admin/* namespace is for the VPS worker and stays separate.
 */

const iso = (v: unknown) =>
  v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : null;

/** One page of the list. Details are read only for the rows shown. */
export const PAGE_SIZE = 25;
/** Each search source returns at most this many; the page says "refine". */
const SEARCH_LIMIT = 25;
const IN_CHUNK = 30; // Firestore's cap on an `in` filter

type Doc = FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot;

const chunks = <T,>(xs: T[], n = IN_CHUNK) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Starts-with on one field: the only search Firestore does natively. */
function prefix(db: FirebaseFirestore.Firestore, field: string, q: string) {
  return db.collection("users").where(field, ">=", q).where(field, "<", `${q}\uf8ff`).limit(SEARCH_LIMIT).get();
}

/**
 * Accounts matching `q`: exact uid, or email / workspace name / display name
 * starting with it. Prefix only — Firestore has no fuzzy search — but each
 * source is one cheap indexed query, whatever the size of the collection.
 */
async function search(db: FirebaseFirestore.Firestore, raw: string): Promise<{ docs: Doc[]; capped: boolean }> {
  const lower = raw.toLowerCase();
  // Names are stored as typed, so a name search is case-sensitive; try it as
  // typed, capitalised, and Each Word Capitalised — how names are written.
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);
  const words = raw.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const [byUid, ...lists] = await Promise.all([
    db.collection("users").doc(raw).get(),
    prefix(db, "email", lower),
    prefix(db, "workspace_username", lower),
    prefix(db, "pending_workspace_username", lower),
    ...[...new Set([raw, title, words])].map((v) => prefix(db, "name", v)),
  ]);
  const seen = new Map<string, Doc>();
  if (byUid.exists) seen.set(byUid.id, byUid);
  for (const l of lists) for (const d of l.docs) seen.set(d.id, d);
  const docs = [...seen.values()].sort((a, b) =>
    String(iso(b.data()?.createdAt) ?? "").localeCompare(String(iso(a.data()?.createdAt) ?? "")),
  );
  return { docs, capped: lists.some((l) => l.size >= SEARCH_LIMIT) };
}

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const db = adminDb();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const after = (url.searchParams.get("after") ?? "").trim().slice(0, 128);

    // The accounts this response is about: a search, or one page by newest.
    let page: Doc[];
    let nextCursor: string | null = null;
    let capped = false;
    if (q.length >= 2) {
      ({ docs: page, capped } = await search(db, q));
    } else {
      let query = db.collection("users").orderBy("createdAt", "desc").limit(PAGE_SIZE + 1);
      if (after) {
        const cursor = await db.collection("users").doc(after).get();
        if (cursor.exists) query = query.startAfter(cursor);
      }
      const snap = await query.get();
      page = snap.docs.slice(0, PAGE_SIZE);
      nextCursor = snap.size > PAGE_SIZE ? page[page.length - 1].id : null;
    }
    const uids = page.map((d) => d.id);
    const firstPage = !after;

    // Everything else is either scoped to those accounts or bounded by
    // something other than the customer count (the VPS fleet, in-flight work,
    // open flags).
    const [queueSnaps, purchaseSnaps, ops, roster, flags, attention, total] = await Promise.all([
      uids.length ? db.getAll(...uids.map((u) => db.collection("provision_queue").doc(u))) : Promise.resolve([]),
      Promise.all(chunks(uids).map((c) => db.collection("credit_purchases").where("uid", "in", c).limit(300).get())),
      db.collection("workspace_ops").where("status", "in", ["queued", "claimed", "failed"]).limit(100).get(),
      db.collection("workspace_roster").get(),
      db.collection("billing_events").where("flag", "==", true).where("resolved", "==", false).limit(100).get(),
      db.collection("provision_queue").where("status", "in", ["queued", "claimed", "failed"]).limit(100).get(),
      db.collection("users").count().get(),
    ]);
    const users = { docs: page };
    const queue = { docs: queueSnaps.filter((d) => d.exists) };
    const purchases = { docs: purchaseSnaps.flatMap((s) => s.docs) };
    const purchasesByUid = new Map<string, { paymentId: string; creditUsd: number; amountMinor: number; currency: string; status: string; createdAt: string }[]>();
    for (const p of purchases.docs) {
      const x = p.data();
      const list = purchasesByUid.get(String(x.uid)) ?? [];
      list.push({
        paymentId: p.id,
        creditUsd: Number(x.creditUsd ?? 0),
        amountMinor: Number(x.amountMinor ?? 0),
        currency: String(x.currency ?? ""),
        status: String(x.status ?? "applied"),
        createdAt: iso(x.createdAt) || "",
      });
      purchasesByUid.set(String(x.uid), list);
    }

    const queueByUid = new Map(queue.docs.map((d) => [d.id, d.data()]));
    const rosterByUsername = new Map(roster.docs.map((d) => [d.id, d.data()]));
    const platform = (username: string | null | undefined) => {
      const r = username ? rosterByUsername.get(username) : undefined;
      return r && !r.gone
        ? {
            suspended: Boolean(r.suspended),
            agentTag: r.agentTag ?? null,
            helixTag: r.helixTag ?? null,
            orManaged: r.orManaged ?? null,
            orDisabled: r.orDisabled ?? null,
            orLimitUsd: r.orLimitUsd ?? null,
            orUsageUsd: r.orUsageUsd ?? null,
            orUsageDailyUsd: r.orUsageDailyUsd ?? null,
            orUsageMonthlyUsd: r.orUsageMonthlyUsd ?? null,
            orHealth: r.orHealth ?? null,
            seenAt: iso(r.updatedAt),
          }
        : null;
    };

    const customers = users.docs.map((doc) => {
      const d = doc.data()!;
      // deriveState wants the API shape; billing/trial pass through as stored.
      // Firestore Timestamps must become ISO strings before deriveState:
      // new Date(Timestamp) is Invalid Date, which reads as "trial ended".
      const profileish = {
        ...d,
        billing: billingFromDoc(d.billing),
        trial: d.trial
          ? {
              ...d.trial,
              startedAt: iso(d.trial.startedAt),
              endsAt: iso(d.trial.endsAt),
            }
          : null,
        earlyAccessRequestedAt: iso(d.earlyAccessRequestedAt),
      } as unknown as UserProfile;
      const q = queueByUid.get(doc.id);
      const ledger = ledgerFromDoc(d.credits);
      const rem = ledger ? remaining(ledger) : null;
      const credits = ledger && rem
        ? {
            remaining: { includedUsd: rem.includedUsd, topupUsd: rem.topupUsd, grantsUsd: rem.grantsUsd },
            includedMonthlyUsd: ledger.includedUsd,
            grants: rem.grants.map((g) => ({ id: g.id, usd: g.usd, expiresAt: g.expiresAt, note: g.note ?? null })),
            pendingChanges: (ledger.pending ?? []).length + (ledger.grantsPending ?? 0),
            spentThisCycleUsd: spentThisCycle(ledger),
            topupBalanceUsd: ledger.topupBalanceUsd,
            usageSyncedAt: ledger.usageSyncedAt,
          }
        : null;
      return {
        uid: d.uid,
        email: d.email,
        name: d.name ?? "",
        country: d.country ?? "",
        createdAt: iso(d.createdAt),
        state: deriveState(profileish),
        workspace: d.workspace_username
          ? { username: d.workspace_username, address: d.workspace_address ?? "" }
          : null,
        pendingUsername: d.pending_workspace_username ?? null,
        billing: d.billing
          ? {
              plan: billingFromDoc(d.billing)?.plan ?? null,
              upcoming: billingFromDoc(d.billing)?.upcoming
                ? { plan: billingFromDoc(d.billing)!.upcoming!.plan, status: billingFromDoc(d.billing)!.upcoming!.status }
                : null,
              status: d.billing.status,
              planCurrency: d.billing.planCurrency,
              currentPeriodEnd: d.billing.currentPeriodEnd ?? null,
            }
          : null,
        credits,
        issues: consistencyIssues({
          billingStatus: d.billing?.status ?? null,
          workspaceUsername: d.workspace_username ?? null,
          queueStatus: q?.status ?? null,
          queueUsername: q?.username ?? null,
          queueUpdatedAt: iso(q?.updatedAt) || null,
          queueRetryAt: iso(q?.retryAt) || null,
          promoRunning: !!d.promo?.endsAt && Date.parse(d.promo.endsAt) > Date.now(),
          queueWorkspaceOnVps: Boolean(q?.username && rosterByUsername.get(q.username) && !rosterByUsername.get(q.username)?.gone),
          rosterSeenAt: (() => {
            const r = rosterByUsername.get(d.workspace_username);
            return r && !r.gone ? iso(r.updatedAt) || null : null;
          })(),
        }),
        comp: compFromDoc(d.comp),
        purchases: (purchasesByUid.get(doc.id) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        queue: q
          ? { status: q.status, error: q.error ?? null, attempts: Number(q.attempts ?? 0), retryAt: iso(q.retryAt) || null }
          : null,
        platform: platform(d.workspace_username),
        enforcement: d.enforcement
          ? {
              reason: d.enforcement.reason,
              suspendedAt: d.enforcement.suspendedAt ?? null,
              removeAfter: removalDate(d.enforcement),
            }
          : null,
      };
    });

    // Workspaces the VPS knows that no site account claims — the manually
    // created era. Shown (on the first page, or matching a search) so the
    // whole fleet is on one page. Bounded by the fleet, not the customers:
    // which usernames are claimed is asked of Firestore, not scanned.
    const live = roster.docs.map((d) => d.data()).filter((r) => !r.gone);
    const shownLive = firstPage
      ? live.filter((r) => !q || String(r.username).startsWith(q.toLowerCase()) || String(r.email).startsWith(q.toLowerCase()))
      : [];
    const claimed = new Set<string>();
    for (const c of chunks(shownLive.map((r) => String(r.username)))) {
      const snap = await db.collection("users").where("workspace_username", "in", c).select("workspace_username").get();
      for (const d of snap.docs) claimed.add(String(d.data().workspace_username));
    }
    const unclaimed = shownLive.filter((r) => !claimed.has(r.username));
    // An account with the same email and no workspace yet: offer to link.
    const matchByEmail = new Map<string, Doc>();
    for (const c of chunks([...new Set(unclaimed.map((r) => String(r.email).toLowerCase()))])) {
      const snap = await db.collection("users").where("email", "in", c).select("email", "workspace_username").get();
      for (const d of snap.docs) if (!d.data().workspace_username) matchByEmail.set(String(d.data().email).toLowerCase(), d);
    }
    const workspaceOnly = unclaimed.map((r) => {
      const u = matchByEmail.get(String(r.email).toLowerCase());
      return {
        matchUid: u?.id ?? null,
        matchEmail: u ? String(u.data()?.email) : null,
        username: r.username,
        email: r.email,
        updatedAt: iso(r.updatedAt),
        firstSeenAt: iso(r.firstSeenAt) || iso(r.updatedAt),
        suspended: Boolean(r.suspended),
        agentTag: r.agentTag ?? null,
        platform: platform(r.username),
      };
    });

    // Who each open flag is about: only those accounts are read.
    const flagUids = [...new Set(flags.docs.map((f) => String(f.data().uid ?? "")).filter(Boolean))];
    const flagUsers = flagUids.length ? await db.getAll(...flagUids.map((u) => db.collection("users").doc(u))) : [];
    const emailByUid = new Map(flagUsers.filter((u) => u.exists).map((u) => [u.id, String(u.data()?.email ?? "")]));
    return Response.json({
      total: total.data().count,
      nextCursor,
      capped,
      query: q.length >= 2 ? q : "",
      customers,
      // Builds that failed or are retrying, account by account — from the
      // queue itself, so they show whichever page is loaded.
      attentionQueues: attention.docs
        .map((d) => ({ uid: d.id, ...d.data() }) as Record<string, unknown> & { uid: string })
        .filter((x) => x.status === "failed" || (x.status === "queued" && Number(x.attempts ?? 0) > 0))
        .map((x) => ({
          uid: x.uid,
          email: String(x.email ?? ""),
          status: String(x.status),
          error: (x.error as string | undefined) ?? null,
          attempts: Number(x.attempts ?? 0),
          retryAt: iso(x.retryAt) || null,
        })),
      workspaceOnly,
      flags: flags.docs
        .map((f) => {
          const x = f.data();
          return {
            id: f.id,
            at: iso(x.receivedAt) || "",
            eventName: String(x.eventName ?? ""),
            reason: String(x.reason ?? x.outcome ?? ""),
            who: x.uid ? emailByUid.get(String(x.uid)) || String(x.uid) : null,
            paymentId: x.paymentId ?? null,
            subscriptionId: x.subscriptionId ?? null,
          };
        })
        .sort((a, b) => b.at.localeCompare(a.at)),
      pendingOps: ops.docs.map((d) => ({
        id: d.id,
        op: d.data().op,
        username: d.data().username,
        status: d.data().status,
        error: d.data().error ?? null,
        attempts: Number(d.data().attempts ?? 0),
        retryAt: iso(d.data().retryAt) || null,
      })),
    });
  } catch (error) {
    return toResponse(error);
  }
}
