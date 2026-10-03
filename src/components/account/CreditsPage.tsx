"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { ComingSoon, PageHeader } from "./PageHeader";
import { hasWorkspace } from "@/lib/account/state";
import { getAllrAuth } from "@/lib/firebase/app";
import {
  ApiCallFailed,
  fetchLedger,
  startTopup,
  type LedgerResponse,
} from "@/lib/firebase/api";

/**
 * The credit meter and the top-up shop.
 *
 * $20 of AI credit comes with every month of the subscription and expires
 * with it; purchased packs carry until used. The meter is as fresh as the
 * platform's last usage push and says so. Payment is a one-time Razorpay
 * order; the balance changes when the webhook lands, never on the browser's
 * say-so — so after checkout this page polls until it does.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("checkout-load")), { once: true });
    if (!existing) {
      script.src = CHECKOUT_SRC;
      document.head.appendChild(script);
    }
  });
}

export function CreditsPage() {
  const { profile } = useAuth();
  // The server refuses a pack without a workspace; don't offer one either.
  const workspaceLive = profile ? hasWorkspace(profile) : false;
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await fetchLedger());
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const buy = useCallback(
    async (packId: string) => {
      setMessage(null);
      setBusy(packId);
      try {
        const [order] = await Promise.all([startTopup(packId), loadCheckout()]);
        const user = getAllrAuth().currentUser;
        const before = data?.ledger?.topupBalanceUsd ?? 0;
        const rzp = new window.Razorpay!({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amountMinor,
          currency: order.currency,
          name: "Allr",
          description: `Credit pack · ${order.display} → $${order.creditUsd.toFixed(2)} of AI credit`,
          prefill: { name: user?.displayName ?? "", email: user?.email ?? "" },
          theme: { color: "#1E7A49" },
          handler: async () => {
            // The webhook is the truth; wait for the balance to move.
            for (let i = 0; i < 15; i++) {
              await new Promise((r) => setTimeout(r, 2000));
              const next = await fetchLedger().catch(() => null);
              if (next?.ledger && next.ledger.topupBalanceUsd > before) {
                setData(next);
                setBusy(null);
                return;
              }
            }
            await refresh();
            setBusy(null);
            setMessage("Payment received — the balance updates within a minute.");
          },
          modal: { ondismiss: () => setBusy(null) },
        });
        rzp.open();
      } catch (error) {
        setBusy(null);
        setMessage(error instanceof ApiCallFailed ? error.message : "Checkout could not open. Try again?");
      }
    },
    [data, refresh],
  );

  const ledger = data?.ledger;

  return (
    <>
      <PageHeader eyebrow="Credits" title="Credit management">
        AI credit comes with every month of your subscription. Bonus credit is
        used before packs, and packs you buy carry over until they’re used.
      </PageHeader>

      {!data ? (
        <p className="text-ink-soft">Loading…</p>
      ) : !ledger ? (
        <ComingSoon what="No credit ledger yet">
          Credits belong to a subscribed workspace. Once yours is live and paid
          for, this page shows the meter and the top-up packs.
        </ComingSoon>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-card border border-line bg-card p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[.8rem] font-bold tracking-[0.05em] text-ink-soft uppercase">This month</p>
                <p className="text-[1.6rem] font-bold text-green-deep">
                  ${ledger.remaining.includedUsd.toFixed(2)}
                  <span className="text-[.95rem] font-semibold text-ink-soft"> of ${ledger.includedUsd} included</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[.8rem] font-bold tracking-[0.05em] text-ink-soft uppercase">Top-up balance</p>
                <p className="text-[1.2rem] font-bold">${ledger.remaining.topupUsd.toFixed(2)}</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-green transition-[width] duration-500"
                style={{ width: `${Math.min(100, (ledger.remaining.includedUsd / Math.max(1, ledger.includedUsd)) * 100)}%` }}
              />
            </div>
            {ledger.grants?.length ? (
              <ul className="mt-4 flex flex-col gap-1 text-[.88rem]">
                {ledger.grants.map((g) => (
                  <li key={g.id}>
                    <b>${g.usd.toFixed(2)}</b> bonus credit
                    {g.note ? ` (${g.note})` : ""}
                    {g.expiresAt
                      ? ` · use by ${new Date(g.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-[.82rem] text-ink-soft">
              Spent this cycle: ${ledger.spentThisCycleUsd.toFixed(2)}
              {ledger.usageSyncedAt
                ? ` · as of ${new Date(ledger.usageSyncedAt).toLocaleTimeString()}`
                : " · first usage report pending"}
            </p>
          </div>

          <div className="rounded-card border border-line bg-card p-6">
            <h3 className="mb-1 text-[1.1rem] font-bold">Add credit</h3>
            {!workspaceLive ? (
              <p className="text-[.92rem] text-ink-soft">
                Credit packs top up a live workspace, and you don’t have one right now.{" "}
                <Link href="/account/billing/" className="font-bold text-green-deep">Subscribe first →</Link>
              </p>
            ) : (
            <>
            <p className="mb-4 text-[.92rem] text-ink-soft">
              One-time payment; never expires until used. Pack prices cover
              payment and AI-provider fees.
            </p>
            <div className="flex flex-wrap gap-3">
              {(data.packs ?? []).map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void buy(pack.id)}
                  className="cursor-pointer rounded-control border border-line bg-card px-5 py-3 text-left font-bold shadow-soft transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-green-line disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="block text-[1.05rem]">${pack.creditUsd.toFixed(2)} credit</span>
                  <span className="block text-[.82rem] font-semibold text-ink-soft">
                    {busy === pack.id ? "Opening checkout…" : `${pack.display.USD} · ${pack.display.INR} in India`}
                  </span>
                </button>
              ))}
            </div>
            </>
            )}
          </div>

          {message ? <p className="text-[.92rem] text-ink-soft">{message}</p> : null}
        </div>
      )}
    </>
  );
}
