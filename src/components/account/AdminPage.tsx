"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { useAuth } from "./AuthProvider";
import {
  ApiCallFailed,
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

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchAdminCustomers());
    } catch (e) {
      setError(e instanceof ApiCallFailed ? e.message : "Could not load.");
    }
  }, []);

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

          <div className="overflow-x-auto rounded-card border border-line bg-card">
            <table className="w-full min-w-[900px] border-collapse text-[.88rem]">
              <thead>
                <tr className="border-b border-line text-left text-[.72rem] tracking-[0.06em] text-ink-soft uppercase">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Joined</th>
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
                    </td>
                    <td className="px-4 py-3">
                      {c.workspace ? (
                        <a href={c.workspace.address} className="text-green-deep no-underline hover:underline" target="_blank" rel="noreferrer">
                          {c.workspace.username}
                        </a>
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
                    <td className="px-4 py-3 text-ink-soft">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
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
