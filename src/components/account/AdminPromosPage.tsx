"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { useAuth } from "./AuthProvider";
import {
  ApiCallFailed,
  adminAction,
  fetchAdminPromos,
  type AdminActionBody,
} from "@/lib/firebase/api";

/**
 * Promo codes: each grants one free month (no payment details) with a small
 * AI credit, capped by uses and optionally by date. One per email, ever —
 * enforced on the server; this page only creates, switches and shows.
 */

const field = "allr-field w-full";
const label = "mb-1 block text-[.78rem] font-bold tracking-[0.04em] text-ink-soft uppercase";
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export function AdminPromosPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminPromos>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const [form, setForm] = useState({ code: "", maxUses: "50", days: "30", creditUsd: "5", expiresAt: "", note: "" });

  const refresh = useCallback(async () => {
    try {
      setData(await fetchAdminPromos());
    } catch (e) {
      setError(e instanceof ApiCallFailed ? e.message : "Could not load.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const act = useCallback(
    async (body: AdminActionBody, confirmText: string | null) => {
      if (confirmText && !window.confirm(confirmText)) return false;
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await adminAction(body);
        await refresh();
        setNotice("Saved.");
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

  if (!isAdmin) {
    return (
      <PageHeader eyebrow="Admin" title="This page is for Allr admins">
        Your account isn’t on the admin list.
      </PageHeader>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Promo codes">
        Each code gives a free month — no payment details — with its own AI
        credit. One promo per email address, ever. When the month ends unpaid,
        the workspace pauses until they subscribe.
      </PageHeader>

      {error ? <p className="mb-4 font-semibold text-alert">{error}</p> : null}
      {notice ? <p className="mb-4 font-semibold text-green-deep">{notice}</p> : null}

      <section className="mb-6 rounded-card border border-line bg-card p-6 shadow-soft">
        <h2 className="mb-4 text-[1.05rem] font-bold">New code</h2>
        <div className="grid gap-3 min-[720px]:grid-cols-3">
          <div>
            <label className={label} htmlFor="pc-code">Code</label>
            <input id="pc-code" className={field} value={form.code} onChange={set("code")} placeholder="LAUNCH-2026" />
          </div>
          <div>
            <label className={label} htmlFor="pc-uses">Max uses</label>
            <input id="pc-uses" className={field} inputMode="numeric" value={form.maxUses} onChange={set("maxUses")} />
          </div>
          <div>
            <label className={label} htmlFor="pc-exp">Expires (optional)</label>
            <input id="pc-exp" className={field} type="date" min={today} value={form.expiresAt} onChange={set("expiresAt")} />
          </div>
          <div>
            <label className={label} htmlFor="pc-days">Free days</label>
            <input id="pc-days" className={field} inputMode="numeric" value={form.days} onChange={set("days")} />
          </div>
          <div>
            <label className={label} htmlFor="pc-credit">AI credit ($)</label>
            <input id="pc-credit" className={field} inputMode="decimal" value={form.creditUsd} onChange={set("creditUsd")} />
          </div>
          <div>
            <label className={label} htmlFor="pc-note">Note (optional)</label>
            <input id="pc-note" className={field} maxLength={120} value={form.note} onChange={set("note")} placeholder="Product Hunt launch" />
          </div>
        </div>
        <button
          type="button"
          disabled={busy || !form.code.trim()}
          className="mt-4 cursor-pointer rounded-control bg-green px-4 py-2 text-[.9rem] font-bold text-white hover:bg-green-deep disabled:cursor-not-allowed disabled:opacity-50"
          onClick={async () => {
            const ok = await act(
              {
                action: "promo_create",
                code: form.code,
                maxUses: Number(form.maxUses),
                days: Number(form.days),
                creditUsd: Number(form.creditUsd),
                expiresAt: form.expiresAt || null,
                note: form.note,
              },
              `Create ${form.code.trim().toUpperCase()}: ${form.maxUses} uses, ${form.days} free days, $${form.creditUsd} AI credit${form.expiresAt ? `, until ${form.expiresAt}` : ", no expiry"}?`,
            );
            if (ok) setForm((f) => ({ ...f, code: "", note: "" }));
          }}
        >
          Create code
        </button>
      </section>

      {!data ? (
        <p className="text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="mb-6 overflow-x-auto rounded-card border border-line bg-card">
            <table className="w-full min-w-[760px] border-collapse text-[.88rem]">
              <thead>
                <tr className="border-b border-line text-left text-[.72rem] tracking-[0.06em] text-ink-soft uppercase">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Free month</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.codes.length === 0 ? (
                  <tr><td className="px-4 py-4 text-ink-soft" colSpan={6}>No codes yet.</td></tr>
                ) : (
                  data.codes.map((c) => {
                    const expired = c.expiresAt ? Date.parse(c.expiresAt) <= now : false;
                    const state = !c.active ? "Off" : expired ? "Expired" : c.uses >= c.maxUses ? "Used up" : "Live";
                    return (
                      <tr key={c.code} className="border-b border-line-soft last:border-0">
                        <td className="px-4 py-3">
                          <b className="font-mono">{c.code}</b>
                          {c.note ? <span className="block text-[.8rem] text-ink-soft">{c.note}</span> : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{c.uses} / {c.maxUses}</td>
                        <td className="px-4 py-3">{c.days} days · ${c.creditUsd}</td>
                        <td className="px-4 py-3">{day(c.expiresAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-chip border px-2 py-0.5 text-[.78rem] font-bold ${state === "Live" ? "border-green-line bg-green-tint text-green-deep" : "border-line bg-paper text-ink-soft"}`}>
                            {state}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            className="cursor-pointer rounded-control border border-line bg-card px-3 py-1 text-[.82rem] font-bold hover:border-honey-line disabled:opacity-50"
                            onClick={() =>
                              void act(
                                { action: "promo_set_active", code: c.code, active: !c.active },
                                c.active ? `Switch ${c.code} off? Nobody can redeem it until it's back on.` : null,
                              )
                            }
                          >
                            {c.active ? "Switch off" : "Switch on"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <section className="rounded-card border border-line bg-card p-6 shadow-soft">
            <h2 className="mb-3 text-[1.05rem] font-bold">Redemptions</h2>
            {data.redemptions.length === 0 ? (
              <p className="text-[.9rem] text-ink-soft">None yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line-soft text-[.9rem]">
                {data.redemptions.map((r) => (
                  <li key={`${r.email}-${r.code}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span><b>{r.email}</b> · <span className="font-mono">{r.code}</span></span>
                    <span className="text-ink-soft">
                      {day(r.redeemedAt)} → free until {day(r.endsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
