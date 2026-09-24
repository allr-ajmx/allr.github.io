"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "./PageHeader";
import { getAllrAuth } from "@/lib/firebase/app";
import {
  ApiCallFailed,
  cancelSubscription,
  checkUsername,
  fetchBilling,
  startSubscription,
} from "@/lib/firebase/api";
import { checkUsernameShape } from "@/lib/admin/username";
import type { BillingSummary } from "@/lib/billing/model";

/**
 * The workspace is the plan, and paying for it is what creates it: pick a
 * name, pay, and the queue builds the workspace. Money moves only inside
 * Razorpay Checkout; the profile flips on Razorpay's webhook, never on the
 * browser's say-so.
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
type NameCheck = { state: "idle" | "checking" | "ok" | "bad"; reason?: string };

export function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: "idle" });
  const checkTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchBilling();
      setSummary(next);
      setUsername((u) => u || next.pendingUsername || "");
      setPhase("ready");
      return next;
    } catch (error) {
      setMessage(error instanceof ApiCallFailed ? error.message : "Something went wrong.");
      setPhase("error");
      return null;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  /** While the queue works, keep looking until the workspace appears. */
  useEffect(() => {
    if (!summary || summary.hasWorkspace) return;
    if (summary.billing?.status !== "active") return;
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [summary, refresh]);

  const onUsername = useCallback((raw: string) => {
    const value = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 31);
    setUsername(value);
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const shape = checkUsernameShape(value);
    if (!shape.ok) {
      setNameCheck(value ? { state: "bad", reason: shape.reason } : { state: "idle" });
      return;
    }
    setNameCheck({ state: "checking" });
    checkTimer.current = window.setTimeout(async () => {
      try {
        const res = await checkUsername(value);
        setNameCheck(res.available ? { state: "ok" } : { state: "bad", reason: res.reason ?? "Taken." });
      } catch {
        setNameCheck({ state: "idle" });
      }
    }, 350);
  }, []);

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
    setMessage("Payment received — it can take a minute to reflect here.");
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setMessage(null);
    setPhase("paying");
    try {
      const needName = summary ? !summary.hasWorkspace : true;
      const [{ subscriptionId, keyId }] = await Promise.all([
        startSubscription(needName ? username : undefined),
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
  }, [awaitWebhook, summary, username]);

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
  const paid = billing?.status === "active";
  const provisioning = summary && paid && !summary.hasWorkspace;
  const needsName = summary ? !summary.hasWorkspace && !paid : false;
  const nameReady = !needsName || nameCheck.state === "ok" || (!!summary?.pendingUsername && username === summary.pendingUsername);
  const periodEnd = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <PageHeader eyebrow="Billing" title="Your workspace, your plan">
        The Allr app is free and stays free. The workspace it connects to is the
        plan — {plan ? `${plan.display}/${plan.interval}` : "one plan"}. Pay,
        and your workspace is built for you.
      </PageHeader>

      {phase === "loading" ? (
        <p className="text-ink-soft">Loading…</p>
      ) : provisioning ? (
        <div className="rounded-card border border-green-line bg-green-tint/40 p-6">
          {summary?.provisioning?.status === "failed" ? (
            <>
              <p className="mb-1 font-bold text-[#A6543C]">Setup hit a snag.</p>
              <p className="text-[.95rem] text-ink-soft">
                Your payment is safe and your name is held. We have been alerted
                and will finish the setup — no action needed from you.
              </p>
            </>
          ) : (
            <>
              <p className="mb-1 font-bold text-green-deep">
                Building {summary?.pendingUsername ? `${summary.pendingUsername}.allr.work` : "your workspace"}…
              </p>
              <p className="text-[.95rem] text-ink-soft">
                Payment received. Your workspace is being set up — this page
                updates itself, usually within a few minutes.
              </p>
            </>
          )}
        </div>
      ) : paid ? (
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

          {needsName ? (
            <div className="mb-5">
              <label htmlFor="ws-name" className="mb-1.5 block text-[.9rem] font-bold">
                Name your workspace
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ws-name"
                  value={username}
                  onChange={(e) => onUsername(e.target.value)}
                  placeholder="yourname"
                  autoComplete="off"
                  spellCheck={false}
                  className="allr-field w-[12rem]"
                />
                <span className="font-mono text-[.9rem] text-ink-soft">.allr.work</span>
              </div>
              <p className="mt-1.5 min-h-[1.2em] text-[.85rem]">
                {nameCheck.state === "checking" ? (
                  <span className="text-ink-soft">Checking…</span>
                ) : nameCheck.state === "ok" ? (
                  <span className="text-green-deep">Available.</span>
                ) : nameCheck.state === "bad" ? (
                  <span className="text-[#A6543C]">{nameCheck.reason}</span>
                ) : null}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void subscribe()}
            disabled={phase === "paying" || phase === "waiting" || !nameReady}
            className="cursor-pointer rounded-control bg-green px-5 py-2.5 text-[.95rem] font-bold text-white shadow-[0_8px_20px_rgba(46,158,99,.28)] hover:bg-green-deep disabled:cursor-not-allowed disabled:opacity-60"
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
