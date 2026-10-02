"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { useAuth } from "./AuthProvider";
import { AdminEditPanel } from "./AdminEditPanel";
import {
  ApiCallFailed,
  adminAction,
  fetchAdminCustomers,
  type AdminActionBody,
  type AdminCustomer,
} from "@/lib/firebase/api";

/**
 * The customer list, read-only. Who sees it is decided on the server
 * (admin-gate): this component's isAdmin check only chooses copy — someone
 * who forges it gets a 403 from the API and an empty page, not data.
 */

type Data = Awaited<ReturnType<typeof fetchAdminCustomers>>;

/** A table row: a site account, or a manual-era workspace with no account. */
type Row = AdminCustomer & { rosterOnly?: boolean };

/** Shown where a manual-era workspace has no such thing (no account yet). */
const NE = "NE";

const STATE_LABEL: Record<string, string> = {
  needsProfile: "no profile",
  registered: "registered",
  requested: "requested",
  provisioning: "provisioning",
  active: "trial",
  trialEnded: "trial ended",
  subscribed: "subscribed",
  pastDue: "past due",
  noAccount: "no account",
};

export function AdminPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchAdminCustomers());
    } catch (e) {
      setError(e instanceof ApiCallFailed ? e.message : "Could not load.");
    }
  }, []);

  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Run one action. Confirms only when given text; true on success. */
  const act = useCallback(
    async (body: AdminActionBody, confirmText: string | null): Promise<boolean> => {
      if (confirmText && !window.confirm(confirmText)) return false;
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await adminAction(body);
        await refresh();
        setNotice("Saved. Workspace changes apply within about a minute.");
        return true;
      } catch (e) {
        setError(e instanceof ApiCallFailed ? e.message : "That didn’t go through.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  if (!isAdmin) {
    return (
      <PageHeader eyebrow="Admin" title="This page is for Allr admins">
        Your account isn’t on the admin list.
      </PageHeader>
    );
  }

  const customers: Row[] = [
    ...(data?.customers ?? []),
    // Manual-era workspaces nobody has signed in for yet: same table, NE
    // where a value doesn't exist; "joined" is the day the roster first saw it.
    ...(data?.workspaceOnly ?? []).map(
      (w): Row => ({
        rosterOnly: true,
        uid: "",
        email: w.email,
        name: "",
        country: "",
        createdAt: w.firstSeenAt,
        state: "noAccount" as Row["state"],
        workspace: { username: w.username, address: `https://${w.username}.allr.work` },
        pendingUsername: null,
        billing: null,
        credits: null,
        queue: null,
        enforcement: null,
        platform: w.platform ?? null,
      }),
    ),
  ];
  const counts = customers.reduce<Record<string, number>>((acc, c) => {
    acc[c.state] = (acc[c.state] ?? 0) + 1;
    return acc;
  }, {});
  const failedQueues = customers.filter((c) => c.queue?.status === "failed");

  return (
    <>
      <PageHeader eyebrow="Admin" title="Customers">
        Every account, its journey, billing and credit — read-only, fresh on
        load.
      </PageHeader>

      {error ? <p className="mb-4 font-semibold text-[#A6543C]">{error}</p> : null}
      {notice ? <p className="mb-4 font-semibold text-green-deep">{notice}</p> : null}
      {!data && !error ? <p className="text-ink-soft">Loading…</p> : null}

      {data ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([state, n]) => (
              <span key={state} className="rounded-chip border border-line bg-card px-3 py-1.5 text-[.82rem] font-bold">
                {n} {STATE_LABEL[state] ?? state}
              </span>
            ))}
            <button
              type="button"
              onClick={() => void refresh()}
              className="cursor-pointer rounded-chip border border-line bg-card px-3 py-1.5 text-[.82rem] font-bold text-honey-deep hover:border-honey-line"
            >
              Refresh
            </button>
          </div>

          {(() => {
            const ops = data.pendingOps ?? [];
            const failedOps = ops.filter((o) => o.status === "failed");
            const retryingQueues = customers.filter((c) => c.queue?.status === "queued" && (c.queue.attempts ?? 0) > 0);
            const retryingOps = ops.filter((o) => o.status === "queued" && o.attempts > 0);
            const inconsistent = customers.filter((c) => (c.issues ?? []).length > 0);
            if (!failedQueues.length && !failedOps.length && !retryingQueues.length && !retryingOps.length && !inconsistent.length) return null;
            const when = (at: string | null | undefined) =>
              at ? ` — next try ${new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "";
            const retryBtn =
              "ml-2 cursor-pointer rounded-control border border-[#EFCFC4] bg-card px-2 py-0.5 text-[.8rem] font-bold text-[#A6543C] hover:bg-white disabled:opacity-50";
            return (
              <div className="rounded-card border border-[#EFCFC4] bg-[#F9E9E4] p-4 text-[.9rem]">
                <p className="mb-1 font-bold text-[#A6543C]">Needs attention</p>
                {failedQueues.map((c) => (
                  <p key={c.uid} className="py-0.5">
                    Provisioning failed for {c.email} after {c.queue?.attempts || 1} attempt(s): {c.queue?.error ?? "unknown"}
                    <button type="button" className={retryBtn} disabled={busy}
                      onClick={() => void act({ action: "retry", kind: "provision", id: c.uid }, null)}>
                      Retry
                    </button>
                  </p>
                ))}
                {failedOps.map((o) => (
                  <p key={o.id} className="py-0.5">
                    Op {o.op} for {o.username || o.id} failed after {o.attempts || 1} attempt(s): {o.error ?? "unknown"}
                    <button type="button" className={retryBtn} disabled={busy}
                      onClick={() => void act({ action: "retry", kind: "op", id: o.id }, null)}>
                      Retry
                    </button>
                  </p>
                ))}
                {inconsistent.flatMap((c) => (c.issues ?? []).map((i) => (
                  <p key={`i-${c.uid}-${i.code}`} className="py-0.5">
                    <b>{c.email}</b>: {i.message}
                    <button type="button" className={retryBtn} disabled={busy} onClick={() => setEditing(c.uid)}>
                      Open
                    </button>
                  </p>
                )))}
                {retryingQueues.map((c) => (
                  <p key={`r-${c.uid}`} className="py-0.5 text-ink-soft">
                    Provisioning for {c.email} failed {c.queue?.attempts}×, retrying automatically{when(c.queue?.retryAt)}: {c.queue?.error ?? "unknown"}
                  </p>
                ))}
                {retryingOps.map((o) => (
                  <p key={`r-${o.id}`} className="py-0.5 text-ink-soft">
                    Op {o.op} for {o.username || o.id} failed {o.attempts}×, retrying automatically{when(o.retryAt)}: {o.error ?? "unknown"}
                  </p>
                ))}
              </div>
            );
          })()}

          {(() => {
            const row = customers.find((c) => (c.uid || `ws:${c.workspace?.username}`) === editing);
            return row ? (
              <AdminEditPanel key={editing!} c={row} busy={busy} act={act} onClose={() => setEditing(null)} />
            ) : null;
          })()}

          <div className="overflow-x-auto rounded-card border border-line bg-card">
            <table className="w-full min-w-[1100px] border-collapse text-[.88rem]">
              <thead>
                <tr className="border-b border-line text-left text-[.72rem] tracking-[0.06em] text-ink-soft uppercase">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">LLM key</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.uid || `ws:${c.workspace?.username}`} className="border-b border-line-soft align-top last:border-0">
                    <td className="px-4 py-3">
                      <span className="block font-bold">{c.name || (c.rosterOnly ? NE : "—")}</span>
                      <span className="block text-ink-soft">{c.email}</span>
                      {c.rosterOnly ? (
                        <span className="block text-[.74rem] text-ink-soft">manual workspace · connects when they sign in</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{STATE_LABEL[c.state] ?? c.state}</span>
                      {c.queue && c.queue.status !== "provisioned" ? (
                        <span className="block text-[.78rem] text-ink-soft">queue: {c.queue.status}</span>
                      ) : null}
                      {c.enforcement ? (
                        <span className="block text-[.76rem] font-bold text-[#A6543C]">
                          off: {c.enforcement.reason}
                          {c.enforcement.removeAfter
                            ? ` · deletes ${new Date(c.enforcement.removeAfter).toLocaleDateString()}`
                            : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {c.workspace ? (
                        <>
                          <a href={c.workspace.address} className="font-semibold text-green-deep no-underline hover:underline" target="_blank" rel="noreferrer">
                            {c.workspace.username}
                          </a>
                          {c.platform?.suspended ? (
                            <span className="ml-2 rounded-chip bg-[#F9E9E4] px-1.5 py-0.5 text-[.68rem] font-bold tracking-[0.04em] text-[#A6543C] uppercase">suspended</span>
                          ) : null}
                          {c.platform ? (
                            <span className="block text-[.76rem] text-ink-soft">
                              agent {c.platform.agentTag ?? "?"} · helix {c.platform.helixTag ?? "?"}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-ink-soft">{c.pendingUsername ? `${c.pendingUsername} (pending)` : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.rosterOnly ? (
                        <span className="text-ink-soft">{NE}</span>
                      ) : c.billing ? (
                        <>
                          <span className="font-semibold">{c.billing.status}</span>
                          <span className="block text-[.78rem] text-ink-soft">
                            {c.billing.planCurrency}
                            {c.billing.currentPeriodEnd ? ` · to ${new Date(c.billing.currentPeriodEnd).toLocaleDateString()}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.rosterOnly ? (
                        <span className="text-ink-soft">{NE}</span>
                      ) : c.credits ? (
                        <>
                          <span>
                            ${c.credits.remaining.includedUsd.toFixed(2)} incl
                            {c.credits.remaining.grantsUsd ? ` · $${c.credits.remaining.grantsUsd.toFixed(2)} granted` : ""}
                            {" · "}${c.credits.remaining.topupUsd.toFixed(2)} pack
                          </span>
                          <span className="block text-[.78rem] text-ink-soft">spent ${c.credits.spentThisCycleUsd.toFixed(2)} this cycle</span>
                        </>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.platform?.orManaged ? (
                        <>
                          <span>
                            ${Number(c.platform.orUsageUsd ?? 0).toFixed(2)} / ${Number(c.platform.orLimitUsd ?? 0).toFixed(2)}
                          </span>
                          {c.platform.orDisabled ? (
                            <span className="block text-[.76rem] font-bold text-[#A6543C]">disabled</span>
                          ) : null}
                          {c.platform.orHealth && c.platform.orHealth !== "ok" ? (
                            <span className="block max-w-[16rem] text-[.74rem] font-bold text-[#A6543C]">⚠ {c.platform.orHealth}</span>
                          ) : null}
                          <span className="block text-[.76rem] text-ink-soft">
                            today ${Number(c.platform.orUsageDailyUsd ?? 0).toFixed(2)} · month ${Number(c.platform.orUsageMonthlyUsd ?? 0).toFixed(2)}
                          </span>
                          {c.platform.seenAt ? (
                            <span className="block text-[.76rem] text-ink-soft">seen {new Date(c.platform.seenAt).toLocaleTimeString()}</span>
                          ) : null}
                        </>
                      ) : c.platform ? (
                        <span className="text-ink-soft">pasted key</span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        c={c}
                        busy={busy}
                        act={act}
                        onEdit={() => setEditing(c.uid || `ws:${c.workspace?.username}`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}


function RowActions({
  c,
  busy,
  act,
  onEdit,
}: {
  c: Row;
  busy: boolean;
  act: (body: AdminActionBody, confirmText: string | null) => Promise<boolean>;
  onEdit: () => void;
}) {
  const btn =
    "cursor-pointer rounded-chip border border-line bg-paper px-2.5 py-1 text-[.78rem] font-bold hover:border-honey-line disabled:opacity-50 disabled:cursor-not-allowed";
  if (!c.workspace && !c.rosterOnly) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <button type="button" disabled={busy} className={btn} onClick={onEdit}>Edit</button>
        <button
          type="button"
          disabled={busy}
          className={btn}
          onClick={() => {
            const username = window.prompt(`Workspace name for ${c.email}? (comp — no payment required)`, c.pendingUsername ?? "");
            if (username) void act({ action: "provision", uid: c.uid, username }, `Provision "${username}" for ${c.email}?`);
          }}
        >
          Provision…
        </button>
      </div>
    );
  }
  return (
    <button type="button" disabled={busy} className={btn} onClick={onEdit}>
      Edit
    </button>
  );
}
