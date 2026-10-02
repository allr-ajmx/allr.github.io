"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { useAuth } from "./AuthProvider";
import { ApiCallFailed, fetchAdminOperations } from "@/lib/firebase/api";

/** The merged audit timeline. Read-only; the server decides who sees it. */

const KIND_TINT: Record<string, string> = {
  lifecycle: "bg-honey-tint text-honey-deep",
  admin: "bg-sage-tint text-ink",
  billing: "bg-green-tint text-green-deep",
  credit: "bg-green-tint text-green-deep",
  ops: "bg-paper text-ink-soft",
  provision: "bg-clay-tint text-ink",
};

export function AdminOpsPage() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<Awaited<ReturnType<typeof fetchAdminOperations>>["events"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setEvents((await fetchAdminOperations()).events);
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

  return (
    <>
      <PageHeader eyebrow="Admin" title="Operations">
        Everything the machines and admins did — provisioning, billing,
        lifecycle, levers — newest first.
      </PageHeader>
      {error ? <p className="mb-4 font-semibold text-[#A6543C]">{error}</p> : null}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => void refresh()}
          className="cursor-pointer rounded-chip border border-line bg-card px-3 py-1.5 text-[.82rem] font-bold text-honey-deep hover:border-honey-line"
        >
          Refresh
        </button>
      </div>
      {!events ? (
        <p className="text-ink-soft">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-ink-soft">Nothing yet — the first provision or payment starts the feed.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-card">
          {events.map((e, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-[.9rem]">
              <span className="w-[9.5rem] shrink-0 font-mono text-[.78rem] text-ink-soft">
                {new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className={`shrink-0 rounded-chip px-2 py-0.5 text-[.68rem] font-bold tracking-[0.04em] uppercase ${KIND_TINT[e.kind] ?? "bg-paper"}`}>
                {e.kind}
              </span>
              <span className={e.status === "failed" ? "font-semibold text-[#A6543C]" : ""}>{e.summary}</span>
              {e.detail ? <span className="text-[.82rem] text-ink-soft">— {e.detail}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
