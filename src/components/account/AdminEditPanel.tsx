"use client";

import { useState } from "react";
import type { AdminActionBody, AdminCustomer } from "@/lib/firebase/api";

/**
 * Edit one customer. Every save is a server action through the same gate,
 * validation and audit as everything else — this panel only collects input.
 * Destructive or identity-changing saves ask once; routine ones don't.
 */

type Row = AdminCustomer & { rosterOnly?: boolean };
type Act = (body: AdminActionBody, confirmText: string | null) => Promise<boolean>;

const field = "allr-field w-full";
const label = "mb-1 block text-[.78rem] font-bold tracking-[0.04em] text-ink-soft uppercase";
const btn =
  "cursor-pointer rounded-control border border-line bg-card px-3 py-1.5 text-[.85rem] font-bold hover:border-honey-line disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "cursor-pointer rounded-control bg-green px-3 py-1.5 text-[.85rem] font-bold text-white hover:bg-green-deep disabled:cursor-not-allowed disabled:opacity-50";
const danger =
  "cursor-pointer rounded-control border border-[#EFCFC4] bg-card px-3 py-1.5 text-[.85rem] font-bold text-[#A6543C] hover:bg-[#F9E9E4] disabled:opacity-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line-soft pt-5">
      <h3 className="mb-3 text-[1rem] font-bold">{title}</h3>
      {children}
    </section>
  );
}

export function AdminEditPanel({
  c,
  busy,
  act,
  onClose,
}: {
  c: Row;
  busy: boolean;
  act: Act;
  onClose: () => void;
}) {
  const [name, setName] = useState(c.name);
  const [country, setCountry] = useState(c.country);
  const [email, setEmail] = useState(c.email);
  const [included, setIncluded] = useState(String(c.credits?.includedMonthlyUsd ?? 20));
  const [grantUsd, setGrantUsd] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [compUntil, setCompUntil] = useState(c.comp?.until?.slice(0, 10) ?? "");
  const [compNote, setCompNote] = useState(c.comp?.note ?? "");

  const ws = c.workspace?.username ?? null;
  const suspended = Boolean(c.platform?.suspended);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="h-full w-full max-w-[30rem] overflow-y-auto bg-paper p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Edit ${c.email}`}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[.78rem] font-bold tracking-[0.04em] text-ink-soft uppercase">
              {c.rosterOnly ? "Manual workspace" : "Customer"}
            </p>
            <h2 className="text-[1.3rem] font-bold">{c.name || c.email}</h2>
            {ws ? <p className="text-[.85rem] text-ink-soft">{ws}.allr.work</p> : null}
          </div>
          <button type="button" className={btn} onClick={onClose}>Close</button>
        </div>

        <div className="flex flex-col gap-5">
          {!c.rosterOnly ? (
            <Section title="Profile">
              <div className="flex flex-col gap-3">
                <div>
                  <label className={label} htmlFor="ae-name">Name</label>
                  <input id="ae-name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="ae-country">Country (2 letters)</label>
                  <input id="ae-country" className={field} value={country} maxLength={2}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <button type="button" className={primary}
                    disabled={busy || (name === c.name && country === c.country)}
                    onClick={() => void act({ action: "edit_profile", uid: c.uid,
                      ...(name !== c.name ? { name } : {}), ...(country !== c.country ? { country } : {}) }, null)}>
                    Save profile
                  </button>
                </div>
              </div>
            </Section>
          ) : null}

          <Section title={c.rosterOnly ? "Workspace email" : "Login email"}>
            <p className="mb-2 text-[.82rem] text-ink-soft">
              {c.rosterOnly
                ? "The address this workspace signs in with. Changing it re-points the SSO login; if that person then signs in on allr.work, the workspace attaches to their account."
                : "Allr accounts are Google sign-ins. Transferring moves the account, workspace, billing and credits to whoever next signs in with the new Google address — the old login stops working immediately."}
            </p>
            <div className="flex gap-2">
              <input className={field} value={email} onChange={(e) => setEmail(e.target.value.trim())} />
              <button type="button" className={danger}
                disabled={busy || !email || email.toLowerCase() === c.email.toLowerCase()}
                onClick={() => void act(
                  c.rosterOnly
                    ? { action: "ws_set_email", username: ws!, email }
                    : { action: "transfer_email", uid: c.uid, email },
                  c.rosterOnly
                    ? `Change ${ws}'s login email from ${c.email} to ${email}?`
                    : `Transfer this account from ${c.email} to ${email}?\n\nThe old Google login stops working now; everything moves to whoever signs in as ${email}.`,
                )}>
                {c.rosterOnly ? "Change" : "Transfer…"}
              </button>
            </div>
          </Section>

          {c.credits ? (
            <Section title="Credits">
              <p className="mb-3 text-[.85rem] text-ink-soft">
                Left now: ${c.credits.remaining.includedUsd.toFixed(2)} included ·
                ${c.credits.remaining.grantsUsd.toFixed(2)} granted · ${c.credits.remaining.topupUsd.toFixed(2)} packs
                {c.credits.pendingChanges ? ` · ${c.credits.pendingChanges} change(s) applying…` : ""}
              </p>

              <label className={label} htmlFor="ae-included">Included every month ($)</label>
              <div className="mb-4 flex gap-2">
                <input id="ae-included" className={field} inputMode="decimal" value={included}
                  onChange={(e) => setIncluded(e.target.value)} />
                <button type="button" className={primary}
                  disabled={busy || Number(included) === c.credits.includedMonthlyUsd || included === ""}
                  onClick={() => void act({ action: "set_included", uid: c.uid, usd: Number(included) }, null)}>
                  Save
                </button>
              </div>

              <p className={label}>Granted credit</p>
              {c.credits.grants.length === 0 ? (
                <p className="mb-3 text-[.85rem] text-ink-soft">None.</p>
              ) : (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {c.credits.grants.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-2 rounded-control border border-line bg-card px-3 py-2 text-[.85rem]">
                      <span>
                        <b>${g.usd.toFixed(2)}</b>
                        {g.expiresAt ? ` · expires ${new Date(g.expiresAt).toLocaleDateString()}` : " · no expiry"}
                        {g.note ? <span className="text-ink-soft"> · {g.note}</span> : null}
                      </span>
                      <button type="button" className={danger} disabled={busy}
                        onClick={() => void act({ action: "revoke_grant", uid: c.uid, grantId: g.id },
                          `Revoke the unspent $${g.usd.toFixed(2)} of this grant?`)}>
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <div>
                  <label className={label} htmlFor="ae-gusd">Amount ($)</label>
                  <input id="ae-gusd" className={field} inputMode="decimal" value={grantUsd}
                    onChange={(e) => setGrantUsd(e.target.value)} placeholder="15" />
                </div>
                <div>
                  <label className={label} htmlFor="ae-gexp">Expires (optional)</label>
                  <input id="ae-gexp" className={field} type="date" min={today} value={grantExpiry}
                    onChange={(e) => setGrantExpiry(e.target.value)} />
                </div>
              </div>
              <label className={`${label} mt-2`} htmlFor="ae-gnote">Note (optional)</label>
              <input id="ae-gnote" className={`${field} mb-2`} value={grantNote} maxLength={120}
                onChange={(e) => setGrantNote(e.target.value)} placeholder="launch promo" />
              <button type="button" className={primary}
                disabled={busy || !(Number(grantUsd) > 0)}
                onClick={async () => {
                  const okd = await act({
                    action: "grant_credit",
                    uid: c.uid,
                    usd: Number(grantUsd),
                    expiresAt: grantExpiry || null,
                    note: grantNote,
                  }, `Grant $${Number(grantUsd).toFixed(2)} of credit${grantExpiry ? ` until ${grantExpiry}` : ", no expiry"}?`);
                  if (okd) { setGrantUsd(""); setGrantExpiry(""); setGrantNote(""); }
                }}>
                Grant credit
              </button>
            </Section>
          ) : !c.rosterOnly && ws ? (
            <Section title="Credits">
              <p className="text-[.85rem] text-ink-soft">No credit ledger yet — it opens with the workspace stamp.</p>
            </Section>
          ) : null}

          {!c.rosterOnly && ws ? (
            <Section title="Complimentary">
              <p className="mb-3 text-[.82rem] text-ink-soft">
                {c.comp
                  ? `On us${c.comp.until ? ` until ${new Date(c.comp.until).toLocaleDateString()}` : ", open-ended"} — set by ${c.comp.by}: ${c.comp.note}`
                  : "A complimentary workspace is never paused for billing. Use it for team, friends, partners and the manual-era workspaces."}
              </p>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <div>
                  <label className={label} htmlFor="ae-cuntil">Until (optional)</label>
                  <input id="ae-cuntil" className={field} type="date" min={today} value={compUntil}
                    onChange={(e) => setCompUntil(e.target.value)} />
                </div>
                <div>
                  <label className={label} htmlFor="ae-cnote">Why</label>
                  <input id="ae-cnote" className={field} maxLength={200} value={compNote}
                    onChange={(e) => setCompNote(e.target.value)} placeholder="founder · design partner" />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" className={primary} disabled={busy || !compNote.trim()}
                  onClick={() => void act({ action: "set_comp", uid: c.uid, until: compUntil || null, note: compNote },
                    `Make ${ws} complimentary${compUntil ? ` until ${compUntil}` : " with no end date"}? It won't be paused for billing.`)}>
                  {c.comp ? "Update" : "Make complimentary"}
                </button>
                {c.comp ? (
                  <button type="button" className={danger} disabled={busy}
                    onClick={() => void act({ action: "clear_comp", uid: c.uid },
                      `Stop ${ws} being complimentary? Without a subscription, the free-week and billing rules apply again.`)}>
                    Remove
                  </button>
                ) : null}
              </div>
            </Section>
          ) : null}

          {c.purchases && c.purchases.length ? (
            <Section title="Credit packs">
              <ul className="flex flex-col gap-1.5">
                {c.purchases.map((p) => (
                  <li key={p.paymentId} className="flex items-center justify-between gap-2 rounded-control border border-line bg-card px-3 py-2 text-[.85rem]">
                    <span>
                      <b>${p.creditUsd.toFixed(2)}</b> · {(p.amountMinor / 100).toLocaleString()} {p.currency}
                      <span className="text-ink-soft"> · {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""} · {p.status}</span>
                      <span className="block font-mono text-[.75rem] text-ink-soft">{p.paymentId}</span>
                    </span>
                    {p.status === "applied" ? (
                      <button type="button" className={danger} disabled={busy}
                        onClick={() => void act({ action: "refund_topup", paymentId: p.paymentId },
                          `Refund this credit pack in full?\n\nThe money goes back to the customer and whatever of its $${p.creditUsd.toFixed(2)} is unspent is taken back.`)}>
                        Refund
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {ws ? (
            <Section title="Workspace">
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btn} disabled={busy}
                  onClick={() => void act(
                    c.rosterOnly
                      ? (suspended ? { action: "ws_resume", username: ws } : { action: "ws_suspend", username: ws })
                      : (suspended ? { action: "resume", uid: c.uid } : { action: "suspend", uid: c.uid }),
                    `${suspended ? "Resume" : "Suspend"} ${ws}?`)}>
                  {suspended ? "Resume" : "Suspend"}
                </button>
                <button type="button" className={danger} disabled={busy}
                  onClick={() => {
                    if (c.rosterOnly) {
                      void act({ action: "ws_remove", username: ws, confirm: ws },
                        `Delete ${ws}'s workspace?\n\nThis removes their containers and ALL their data permanently. There is no undo.`);
                      return;
                    }
                    const paying = c.billing && c.billing.status !== "ended";
                    if (!window.confirm(
                      `Delete ${ws}'s workspace?\n\nThis removes their containers and ALL their data permanently. There is no undo.` +
                      (paying ? "\n\nTheir subscription is cancelled immediately — no further charges." : ""),
                    )) return;
                    const refund = paying
                      ? window.confirm("Also REFUND their most recent payment?\n\nOK = refund it · Cancel = no refund")
                      : false;
                    void act({ action: "remove", uid: c.uid, confirm: ws, refund }, null);
                  }}>
                  Remove workspace…
                </button>
              </div>
            </Section>
          ) : null}

          {!c.rosterOnly ? (
            <Section title="Account">
              <p className="mb-2 text-[.82rem] text-ink-soft">
                {ws
                  ? "To delete this account, remove its workspace first."
                  : "Deletes the account completely: cancels any subscription, frees reserved names and the email, and removes the Google login. They can sign up again from scratch. Payment history is kept."}
              </p>
              <button type="button" className={danger} disabled={busy || Boolean(ws)}
                onClick={() => void act({ action: "delete_account", uid: c.uid, confirm: c.email },
                  `Delete the account ${c.email}?\n\n` +
                  (c.billing && c.billing.status !== "ended" ? "Their subscription is cancelled now. " : "") +
                  "Profile, reserved names and login are removed. There is no undo.")}>
                Delete account…
              </button>
            </Section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
