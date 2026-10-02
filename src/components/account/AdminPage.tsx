"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { useAuth } from "./AuthProvider";
import {
  ApiCallFailed,
  adminAction,
  fetchAdminCustomers,
  type AdminCustomer,
} from "@/lib/firebase/api";

/**
 * The customer list, read-only. Who sees it is decided on the server
 * (admin-gate): this component's isAdmin check only chooses copy — someone
 * who forges it gets a 403 from the API and an empty page, not data.
 */

type Data = Awaited<ReturnType<typeof fetchAdminCustomers>>;

const STATE_LABEL: Record<string, string> = {
  needsProfile: "no profile",
  registered: "registered",
  requested: "requested",
  provisioning: "provisioning",
  active: "trial",
  trialEnded: "trial ended",
  subscribed: "subscribed",
  pastDue: "past due",
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

  const act = useCallback(
    async (body: Parameters<typeof adminAction>[0], confirmText: string) => {
      if (!window.confirm(confirmText)) return;
      setBusy(true);
      setError(null);
      try {
        await adminAction(body);
        await refresh();
      } catch (e) {
        setError(e instanceof ApiCallFailed ? e.message : "That didn’t go through.");
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

  const customers = data?.customers ?? [];
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

          {failedQueues.length > 0 || (data.pendingOps ?? []).some((o) => o.status === "failed") ? (
            <div className="rounded-card border border-[#EFCFC4] bg-[#F9E9E4] p-4 text-[.9rem]">
              <p className="mb-1 font-bold text-[#A6543C]">Needs attention</p>
              {failedQueues.map((c) => (
                <p key={c.uid}>Provisioning failed for {c.email}: {c.queue?.error ?? "unknown"}</p>
              ))}
              {(data.pendingOps ?? [])
                .filter((o) => o.status === "failed")
                .map((o) => (
                  <p key={o.id}>Op {o.op} for {o.username || o.id} failed: {o.error ?? "unknown"}</p>
                ))}
            </div>
          ) : null}

          {(data.workspaceOnly ?? []).length > 0 ? (
            <div className="rounded-card border border-line bg-card p-4">
              <p className="mb-2 text-[.8rem] font-bold tracking-[0.05em] text-ink-soft uppercase">
                Workspaces without a site account (manually created)
              </p>
              <div className="flex flex-wrap gap-2 text-[.85rem]">
                {data.workspaceOnly.map((w) => (
                  <span key={w.username} className="inline-flex items-center gap-2 rounded-chip border border-line bg-paper px-3 py-1.5">
                    <span>
                      <b>{w.username}</b> · {w.email}
                      {w.suspended ? <span className="ml-1.5 font-bold text-[#A6543C]">· suspended</span> : null}
                      {w.agentTag ? <span className="text-ink-soft"> · agent {w.agentTag}</span> : null}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      className="cursor-pointer text-[.78rem] font-bold text-honey-deep hover:underline disabled:opacity-50"
                      onClick={() =>
                        void act(
                          { action: w.suspended ? "ws_resume" : "ws_suspend", username: w.username },
                          `${w.suspended ? "Resume" : "Suspend"} ${w.username}?`,
                        )
                      }
                    >
                      {w.suspended ? "Resume" : "Suspend"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="cursor-pointer text-[.78rem] font-bold text-[#A6543C] hover:underline disabled:opacity-50"
                      onClick={() =>
                        void act(
                          { action: "ws_remove", username: w.username, confirm: w.username },
                          `Delete ${w.username}'s workspace?\n\nThis removes their containers and ALL their data permanently. There is no undo.`,
                        )
                      }
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[.78rem] text-ink-soft">
                These connect automatically the moment their owner signs in on
                allr.work with that email.
              </p>
            </div>
          ) : null}

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
                  <tr key={c.uid} className="border-b border-line-soft align-top last:border-0">
                    <td className="px-4 py-3">
                      <span className="block font-bold">{c.name || "—"}</span>
                      <span className="block text-ink-soft">{c.email}</span>
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
                      {c.billing ? (
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
                      {c.credits ? (
                        <>
                          <span>${c.credits.remaining.includedUsd.toFixed(2)} incl · ${c.credits.remaining.topupUsd.toFixed(2)} pack</span>
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
                      <RowActions c={c} busy={busy} act={act} />
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
}: {
  c: AdminCustomer;
  busy: boolean;
  act: (body: Parameters<typeof adminAction>[0], confirm: string) => Promise<void>;
}) {
  const btn =
    "cursor-pointer rounded-chip border border-line bg-paper px-2 py-1 text-[.75rem] font-bold hover:border-honey-line disabled:opacity-50 disabled:cursor-not-allowed";
  if (!c.workspace) {
    return (
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
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={busy}
        className={btn}
        onClick={() => {
          const usd = Number(window.prompt(`Grant how many dollars of credit to ${c.email}?`, "10"));
          if (usd > 0) void act({ action: "grant_credit", uid: c.uid, usd }, `Grant $${usd} to ${c.email}? This is free credit.`);
        }}
      >
        + credit
      </button>
      <button
        type="button"
        disabled={busy}
        className={btn}
        onClick={() => {
          const usd = Number(window.prompt(`Monthly included credit for ${c.email}? (default 20)`, "20"));
          if (usd >= 0) void act({ action: "set_included", uid: c.uid, usd }, `Set ${c.email}'s monthly included credit to $${usd}?`);
        }}
      >
        included…
      </button>
      <button
        type="button"
        disabled={busy}
        className={btn}
        onClick={() => void act({ action: "suspend", uid: c.uid }, `Suspend ${c.workspace?.username}? Their workspace goes offline until resumed.`)}
      >
        Suspend
      </button>
      <button
        type="button"
        disabled={busy}
        className={btn}
        onClick={() => void act({ action: "resume", uid: c.uid }, `Resume ${c.workspace?.username}?`)}
      >
        Resume
      </button>
      <button
        type="button"
        disabled={busy}
        className={`${btn} !border-[#EFCFC4] !text-[#A6543C]`}
        onClick={() => {
          const name = c.workspace!.username;
          // One confirmation, worded for what it is. The server still
          // requires the workspace name in the request, so nothing else
          // can trigger this by accident.
          void act(
            { action: "remove", uid: c.uid, confirm: name },
            `Delete ${name}'s workspace?\n\nThis removes their containers and ALL their data permanently. There is no undo.`,
          );
        }}
      >
        Remove…
      </button>
    </div>
  );
}
