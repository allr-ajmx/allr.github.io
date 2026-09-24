"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";
import { getAllrAuth } from "@/lib/firebase/app";
import {
  ApiCallFailed,
  cancelSubscription,
  fetchBilling,
  startSubscription,
} from "@/lib/firebase/api";
import type { BillingSummary } from "@/lib/billing/model";

/**
 * The workspace is the plan; this page is where it gets paid for.
 *
 * Money moves only inside Razorpay Checkout, and the profile flips to paid
 * only when Razorpay's webhook says so — the checkout callback here just
 * refreshes until the webhook has landed.
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

type Phase = "loading" | "ready" | "paying" | "waiting" | "error";

export function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchBilling();
      setSummary(next);
      setPhase("ready");
      return next;
    } catch (error) {
      setMessage(error instanceof ApiCallFailed ? error.message : "Something went wrong.");
      setPhase("error");
      return null;
    }
  }, []);

  useEffect(() => {
    // Deferred a tick: the lint rule is right that a synchronous setState
    // inside an effect can cascade when the fetch resolves immediately.
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  /** After checkout closes, the webhook is what changes state; poll for it. */
  const awaitWebhook = useCallback(async () => {
    setPhase("waiting");
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const next = await fetchBilling().catch(() => null);
      if (next?.billing?.status === "active") {
        setSummary(next);
        setPhase("ready");
        setMessage(null);
        return;
      }
    }
    await refresh();
    setMessage(
      "Payment received — it can take a minute to reflect here. This page will show it shortly.",
    );
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setMessage(null);
    setPhase("paying");
    try {
      const [{ subscriptionId, keyId }] = await Promise.all([
        startSubscription(),
        loadCheckout(),
      ]);
      const user = getAllrAuth().currentUser;
      const rzp = new window.Razorpay!({
        key: keyId,
        subscription_id: subscriptionId,
        name: "Allr",
        description: "Allr workspace · monthly",
        prefill: { name: user?.displayName ?? "", email: user?.email ?? "" },
        theme: { color: "#1E7A49" },
        handler: () => void awaitWebhook(),
        modal: { ondismiss: () => setPhase("ready") },
      });
      rzp.open();
    } catch (error) {
      setMessage(error instanceof ApiCallFailed ? error.message : "Checkout could not open. Try again?");
      setPhase("ready");
    }
  }, [awaitWebhook]);

  const cancel = useCallback(async () => {
    if (!window.confirm("Cancel at the end of the paid period?")) return;
    setMessage(null);
    try {
      await cancelSubscription();
      await refresh();
      setMessage("Done — your workspace stays up until the end of the period you paid for.");
    } catch (error) {
      setMessage(error instanceof ApiCallFailed ? error.message : "Something went wrong.");
    }
  }, [refresh]);

  const billing = summary?.billing ?? null;
  const plan = summary?.plan ?? null;
  const periodEnd = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <PageHeader eyebrow="Billing" title="Paying for your workspace">
        The Allr app is free and stays free. The workspace it connects to is the
        plan — {plan ? `${plan.display}/${plan.interval}` : "one plan"} — and this
        is where it’s paid for.
      </PageHeader>

      {phase === "loading" ? (
        <p className="text-ink-soft">Loading…</p>
      ) : billing?.status === "active" ? (
        <div className="rounded-card border border-green-line bg-green-tint/40 p-6">
          <p className="mb-1 font-bold text-green-deep">Your workspace is paid for.</p>
          <p className="mb-4 text-[.95rem] text-ink-soft">
            {plan?.display}/{plan?.interval}
            {periodEnd ? ` · renews ${periodEnd}` : ""}
          </p>
          <button
            type="button"
            onClick={() => void cancel()}
            className="cursor-pointer rounded-control border border-line bg-card px-4 py-2 text-[.92rem] font-bold hover:border-honey-line"
          >
            Cancel subscription
          </button>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-card p-6">
          {billing?.status === "pastDue" ? (
            <p className="mb-4 font-semibold text-[#A6543C]">
              Your last payment didn’t go through. Pick up where you left off —
              nothing is lost yet.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void subscribe()}
            disabled={phase === "paying" || phase === "waiting"}
            className="cursor-pointer rounded-control bg-green px-5 py-2.5 text-[.95rem] font-bold text-white shadow-[0_8px_20px_rgba(46,158,99,.28)] hover:bg-green-deep disabled:cursor-wait disabled:opacity-70"
          >
            {phase === "waiting"
              ? "Confirming payment…"
              : phase === "paying"
                ? "Opening checkout…"
                : plan
                  ? `Subscribe · ${plan.display}/${plan.interval}`
                  : "Subscribe"}
          </button>
          <p className="mt-3 text-[.85rem] text-ink-soft">
            Payments are handled by Razorpay. Cancel any time — your workspace
            stays up to the end of the period you paid for.
          </p>
        </div>
      )}

      {message ? <p className="mt-4 text-[.92rem] text-ink-soft">{message}</p> : null}
    </>
  );
}
