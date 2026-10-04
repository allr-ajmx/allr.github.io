"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { ComingSoon, PageHeader } from "./PageHeader";
import { hasWorkspace } from "@/lib/account/state";
import { CREDIT_MIN_USD } from "@/lib/billing/plans";
import { getAllrAuth } from "@/lib/firebase/app";
import {
  ApiCallFailed,
  fetchLedger,
  startCreditSubscription,
  startTopup,
  type LedgerResponse,
} from "@/lib/firebase/api";

/**
 * The credit meter and the top-up shop.
 *
 * Available credit is everything purchased minus everything used. Monthly
 * credit and top-ups add to the same balance and roll over. The meter is as
 * fresh as the platform's last usage push.
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
  const workspacePaid = profile?.billing?.status === "active";
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [monthly, setMonthly] = useState(String(CREDIT_MIN_USD === 1 ? 20 : CREDIT_MIN_USD));
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

  const buyMonthly = useCallback(async () => {
    const amount = Math.round(Number(monthly));
    if (!Number.isInteger(amount) || amount < CREDIT_MIN_USD) {
      setMessage(`Enter at least $${CREDIT_MIN_USD}.`);
      return;
    }
    setMessage(null);
    setBusy("monthly");
    try {
      const [credit] = await Promise.all([startCreditSubscription(amount), loadCheckout()]);
      const user = getAllrAuth().currentUser;
      const rzp = new window.Razorpay!({
        key: credit.keyId,
        subscription_id: credit.subscriptionId,
        name: "Allr",
        description: `AI credit · $${credit.amountUsd}/month`,
        prefill: { name: user?.displayName ?? "", email: user?.email ?? "" },
        theme: { color: "#1E7A49" },
        handler: async () => {
          await refresh();
          setBusy(null);
          setMessage(
            credit.startsAt
              ? `$${credit.amountUsd} a month starts at your next renewal. Available credit is unchanged until then.`
              : "Monthly credit is set. The balance updates when the payment lands.",
          );
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (error) {
      setBusy(null);
      setMessage(error instanceof ApiCallFailed ? error.message : "Checkout could not open. Try again?");
    }
  }, [monthly, refresh]);

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
        Available credit is what you have paid for and not yet used. Monthly
        credit and top-ups add to the same balance.
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
            <div className="mb-4">
              <p className="text-[.8rem] font-bold tracking-[0.05em] text-ink-soft uppercase">Available</p>
              <p className="text-[1.6rem] font-bold text-green-deep">
                ${(ledger.availableUsd ?? ledger.remaining.includedUsd).toFixed(2)}
              </p>
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
              {ledger.usageSyncedAt
                ? `Usage last reported ${new Date(ledger.usageSyncedAt).toLocaleTimeString()}.`
                : "First usage report pending."}
            </p>
          </div>

          <div className="rounded-card border border-line bg-card p-6">
            <h3 className="mb-1 text-[1.1rem] font-bold">Monthly credit</h3>
            {workspacePaid ? (
              <>
                <p className="mb-3 text-[.92rem] text-ink-soft">
                  A whole number of dollars, at least ${CREDIT_MIN_USD}. Changing it replaces your current monthly credit at the next renewal. The balance you have stays.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">$</span>
                  <input
                    type="number"
                    min={CREDIT_MIN_USD}
                    step={1}
                    value={monthly}
                    onChange={(e) => setMonthly(e.target.value)}
                    className="allr-field w-[6rem]"
                    aria-label="Monthly AI credit in dollars"
                  />
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void buyMonthly()}
                    className="cursor-pointer rounded-control bg-green px-4 py-2 text-[.92rem] font-bold text-white hover:bg-green-deep disabled:opacity-60"
                  >
                    {busy === "monthly" ? "Opening checkout…" : "Update monthly credit"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-[.92rem] text-ink-soft">
                Subscribe to a workspace first. Then you can add a monthly credit here.
              </p>
            )}
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
              One-time payment added to available credit. The price is the credit. Tax is added on the payment screen.
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
