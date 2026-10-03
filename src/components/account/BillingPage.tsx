"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { getAllrAuth } from "@/lib/firebase/app";
import {
  ApiCallFailed,
  cancelSubscription,
  checkUsername,
  fetchBilling,
  changePlan,
  fetchBillingHistory,
  redeemPromoCode,
  startSubscription,
} from "@/lib/firebase/api";
import { checkUsernameShape } from "@/lib/admin/username";
import type { BillingSummary } from "@/lib/billing/model";
import { workspaceStatus } from "@/lib/account/workspace-status";
import { formatMoney, type HistoryItem } from "@/lib/billing/history";
import { prorate, type PlanKey } from "@/lib/billing/plans";

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
  const { profile, refresh: refreshProfile } = useAuth();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [history, setHistory] = useState<{ items: HistoryItem[]; invoicesUnavailable: boolean } | null>(null);
  /** This visit watched the build finish: say so once, plainly. */
  const [justWentLive, setJustWentLive] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: "idle" });
  const checkTimer = useRef<number | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [planChoice, setPlanChoice] = useState<PlanKey>("workspace_ai");
  const [changing, setChanging] = useState(false);
  /** Captured once: proration previews must not shift between renders. */
  const [openedAt] = useState(() => Date.now());
  const [promoCode, setPromoCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  /** False once the page is gone: background waits stop touching state. */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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
    fetchBillingHistory().then(setHistory).catch(() => setHistory(null));
    return () => clearTimeout(t);
  }, [refresh]);

  /** While the queue works, keep looking until the workspace appears. */
  // A build is owed (paid, or a promo month) exactly when the queue holds one.
  const buildQueued = ["queued", "claimed", "failed"].includes(summary?.provisioning?.status ?? "");
  useEffect(() => {
    if (!summary || summary.hasWorkspace) return;
    if (!buildQueued) return;
    // A stalled build waits on retries or a person: once a minute is plenty.
    const ms = summary.provisioning?.status === "failed" ? 60_000 : 5_000;
    const t = setInterval(async () => {
      const next = await refresh();
      if (next?.hasWorkspace) {
        setJustWentLive(true);
        // Reload the profile so the rail, Overview and Credits flip together.
        await refreshProfile();
      }
    }, ms);
    return () => clearInterval(t);
  }, [summary, buildQueued, refresh, refreshProfile]);

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
      if (!mounted.current) return;
      const next = await fetchBilling().catch(() => null);
      if (!mounted.current) return;
      if (next?.billing?.status === "active") {
        setSummary(next);
        setPhase("ready");
        setMessage(null);
        fetchBillingHistory().then(setHistory).catch(() => {});
        await refreshProfile();
        return;
      }
    }
    if (!mounted.current) return;
    await refresh();
    setMessage("Payment received — it can take a minute to reflect here.");
  }, [refresh, refreshProfile]);

  const redeem = useCallback(async () => {
    setMessage(null);
    setRedeeming(true);
    try {
      const { promo } = await redeemPromoCode(promoCode, username || undefined);
      await Promise.all([refresh(), refreshProfile()]);
      setPromoOpen(false);
      setMessage(
        `Code accepted — your free month runs until ${new Date(promo.endsAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })}. Your workspace is being built.`,
      );
    } catch (error) {
      setMessage(error instanceof ApiCallFailed ? error.message : "That code couldn’t be applied. Try again?");
    } finally {
      setRedeeming(false);
    }
  }, [promoCode, username, refresh, refreshProfile]);

  const subscribe = useCallback(async () => {
    setMessage(null);
    setPhase("paying");
    try {
      const needName = summary ? !summary.hasWorkspace : true;
      const keepPlan = summary?.billing?.status === "pastDue";
      const [{ subscriptionId, keyId }] = await Promise.all([
        startSubscription(needName ? username : undefined, keepPlan ? undefined : planChoice),
        loadCheckout(),
      ]);
      const user = getAllrAuth().currentUser;
      const rzp = new window.Razorpay!({
        key: keyId,
        subscription_id: subscriptionId,
        name: "Allr",
        description: `Allr · ${(summary?.plans ?? []).find((p) => p.key === planChoice)?.name ?? "workspace"} · monthly`,
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
  }, [awaitWebhook, summary, username, planChoice]);

  /**
   * Switch plan: Checkout authorises the new plan's subscription (an upgrade
   * also pays its prorated difference there); we then wait for Razorpay to
   * confirm the mandate, which is when the change is set.
   */
  const switchPlan = useCallback(async (to: PlanKey) => {
    setMessage(null);
    setChanging(true);
    try {
      const [change] = await Promise.all([changePlan(to), loadCheckout()]);
      const user = getAllrAuth().currentUser;
      const rzp = new window.Razorpay!({
        key: change.keyId,
        subscription_id: change.subscriptionId,
        name: "Allr",
        description: change.kind === "upgrade"
          ? `Upgrade to ${change.plan.name} · rest of this cycle now, then ${change.plan.display}/${change.plan.interval}`
          : `${change.plan.name} from your renewal date · ${change.plan.display}/${change.plan.interval}`,
        prefill: { name: user?.displayName ?? "", email: user?.email ?? "" },
        theme: { color: "#1E7A49" },
        handler: async () => {
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            if (!mounted.current) return;
            const next = await fetchBilling().catch(() => null);
            if (next?.billing?.upcoming?.status === "authenticated") {
              setSummary(next);
              await refreshProfile();
              setMessage(change.kind === "upgrade"
                ? `Upgraded — your AI credit is on now. ${change.plan.name} renews at ${change.plan.display}/${change.plan.interval} from your next billing date.`
                : `Done — you'll switch to ${change.plan.name} on your renewal date. Your AI credit lasts until then.`);
              setChanging(false);
              return;
            }
          }
          await refresh();
          setMessage("Payment received — the change can take a minute to show here.");
          setChanging(false);
        },
        modal: { ondismiss: () => setChanging(false) },
      });
      rzp.open();
    } catch (error) {
      setMessage(error instanceof ApiCallFailed ? error.message : "That change couldn't start. Try again?");
      setChanging(false);
    }
  }, [refresh, refreshProfile]);

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
  const status =
    profile && summary
      ? workspaceStatus({ ...profile, billing }, summary.provisioning)
      : null;
  const needsName = summary ? !summary.hasWorkspace : false;
  const nameReady = !needsName || nameCheck.state === "ok" || (!!summary?.pendingUsername && username === summary.pendingUsername);
  const day = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
      : null;
  const canSubscribe =
    status?.kind === "none" ||
    status?.kind === "paymentDue" ||
    status?.kind === "trialEnded" ||
    (status?.kind === "live" && !status.paid && !status.complimentary) ||
    (status?.kind === "ending" && status.canResubscribe) ||
    (status?.kind === "paused" && !status.resuming);
  const card = "rounded-card border border-line bg-card p-6 shadow-soft";

  return (
    <>
      <PageHeader eyebrow="Billing" title="Your plan">
        The Allr app is free and stays free. The workspace it connects to is the
        plan — {plan ? `${plan.display}/${plan.interval}` : "one plan"}, with $20 of AI
        credit every month.
      </PageHeader>

      {phase === "error" && !summary ? (
        <div className={card}>
          <p className="mb-3 text-[.95rem] text-ink-soft">{message ?? "Billing couldn’t be loaded."}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="cursor-pointer rounded-control border border-line bg-card px-4 py-2 text-[.92rem] font-bold hover:border-honey-line"
          >
            Try again
          </button>
        </div>
      ) : phase === "loading" || !status ? (
        <p className="text-ink-soft">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {status.kind === "building" ? (
            <section className={card}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-[1.2rem] text-ink">
                  {status.username ? `${status.username}.allr.work` : "Your workspace"}
                </p>
                <Pill tone="honey">{status.delayed ? "Taking longer" : "Building"}</Pill>
              </div>
              <p className="text-[.95rem] leading-[1.7] text-ink-soft">
                {status.delayed
                  ? "Setup hit a snag. Your payment is safe and your name is held — we’ve been alerted and will finish it. No action needed from you."
                  : "Payment received. Your workspace is being built — this page updates itself, usually within a few minutes."}
              </p>
            </section>
          ) : null}

          {(status.kind === "live" && status.paid) || status.kind === "ending" || status.kind === "paymentDue" ? (
            <section className={card}>
              {justWentLive && status.kind === "live" ? (
                <p className="mb-3 font-bold text-green-deep">Your workspace is live.</p>
              ) : null}
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[1.35rem] font-bold text-ink">
                  {plan?.name} · {plan?.display}
                  <span className="text-[.95rem] font-semibold text-ink-soft">/{plan?.interval}</span>
                </p>
                <Pill tone={status.kind === "live" ? "green" : "honey"}>
                  {status.kind === "live"
                    ? "Active"
                    : status.kind === "ending"
                      ? status.over ? "Ended" : "Cancelled"
                      : "Payment due"}
                </Pill>
              </div>
              <p className="mb-5 text-[.95rem] leading-[1.7] text-ink-soft">
                {status.kind === "live"
                  ? status.renewsAt
                    ? `Renews ${day(status.renewsAt)}. ${status.username}.allr.work is running.`
                    : `${status.username}.allr.work is running.`
                  : status.kind === "ending"
                    ? status.over
                      ? `Your subscription has ended, so ${status.username}.allr.work is about to pause. Resubscribe below to keep it running.`
                      : `No further charges. ${status.username}.allr.work stays up until ${day(status.endsAt) ?? "the end of the period you paid for"}.` +
                        (status.canResubscribe ? "" : " You can subscribe again once it ends.")
                    : "Your last payment didn’t go through. Your workspace is still up — pay below to keep it that way; it’s paused if the payment isn’t fixed soon."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button href={status.address} variant={status.kind === "live" ? "green" : "ghost"}>
                  Open workspace
                </Button>
                {status.kind === "live" ? (
                  <button
                    type="button"
                    onClick={() => void cancel()}
                    className="cursor-pointer rounded-control border border-line bg-card px-5 py-2.5 text-[.95rem] font-bold text-ink hover:border-honey-line"
                  >
                    Cancel subscription
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {status.kind === "live" && status.paid && status.plan && summary?.billing ? (
            <PlanSwitch
              current={status.plan}
              switching={status.switching}
              billing={summary.billing}
              plans={summary.plans}
              now={openedAt}
              busy={changing}
              onSwitch={(to) => void switchPlan(to)}
              day={day}
            />
          ) : null}

          {status.kind === "live" && !status.paid ? (
            <section className={card}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-[1.2rem] text-ink">{status.username}.allr.work</p>
                <Pill tone={status.promoEndsAt || status.complimentary ? "green" : "honey"}>
                  {status.complimentary ? "Complimentary" : status.promoEndsAt ? "Free month" : "No plan yet"}
                </Pill>
              </div>
              <p className="mb-4 text-[.95rem] leading-[1.7] text-ink-soft">
                {status.complimentary
                  ? `Your workspace is on us — no payment needed${status.complimentary.until ? ` until ${day(status.complimentary.until)}` : ""}.`
                  : status.promoEndsAt
                  ? `Your free month runs until ${day(status.promoEndsAt)}. Subscribe before then to keep it running after — subscribing starts your first paid month today.`
                  : "Your workspace is running but isn’t on a paid plan. Subscribe to keep it running — everything in it stays exactly where it is."}
              </p>
              <Button href={status.address} variant="ghost">Open workspace</Button>
            </section>
          ) : null}

          {status.kind === "paused" || status.kind === "trialEnded" ? (
            <section className={card}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif text-[1.2rem] text-ink">{status.username}.allr.work</p>
                <Pill tone="honey">
                  {status.kind === "trialEnded" ? (status.promo ? "Free month ended" : "Free week ended") : status.resuming ? "Resuming" : "Paused"}
                </Pill>
              </div>
              <p className="text-[.95rem] leading-[1.7] text-ink-soft">
                {status.kind === "trialEnded"
                  ? "Subscribe and keep everything in it."
                  : status.resuming
                    ? "Your payment went through. The workspace is being started again — usually within a few minutes."
                    : status.cause === "trial"
                      ? "Your free week ended. Subscribe and it comes straight back, just as you left it."
                      : `${status.cause === "cancelled" ? "Paused because your subscription ended." : "Paused because payment didn’t go through."} Subscribe and it comes straight back${status.removeAfter ? ` — otherwise it is removed on ${day(status.removeAfter)}` : ""}.`}
              </p>
            </section>
          ) : null}

          {canSubscribe ? (
            <section className="rounded-card border border-line bg-card p-6 shadow-soft">
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
                      <span className="text-alert">{nameCheck.reason}</span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {status.kind !== "paymentDue" && summary?.plans?.length ? (
                <fieldset className="mb-5">
                  <legend className="mb-2 text-[.9rem] font-bold">Choose a plan</legend>
                  <div className="grid gap-3 min-[640px]:grid-cols-2">
                    {summary.plans.map((p) => (
                      <label
                        key={p.key}
                        className={`cursor-pointer rounded-control border p-4 ${planChoice === p.key ? "border-green-line bg-green-tint/40" : "border-line bg-card"}`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={p.key}
                          checked={planChoice === p.key}
                          onChange={() => setPlanChoice(p.key)}
                          className="sr-only"
                        />
                        <span className="block font-bold text-ink">{p.name}</span>
                        <span className="block text-[1.1rem] font-bold text-ink">
                          {p.display}<span className="text-[.85rem] font-semibold text-ink-soft">/month</span>
                        </span>
                        <span className="mt-1 block text-[.85rem] text-ink-soft">
                          {p.aiUsd > 0
                            ? `Includes $${p.aiUsd} of AI credit every month.`
                            : "Bring your own AI key — add it on the Keys page in your workspace."}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
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
                    : status.kind === "paymentDue"
                      ? "Pay now"
                      : (() => {
                          const chosen = summary?.plans?.find((p) => p.key === planChoice);
                          const verb = status.kind === "ending" ? "Resubscribe" : "Subscribe";
                          return chosen ? `${verb} · ${chosen.name} · ${chosen.display}/month` : verb;
                        })()}
              </button>
              <p className="mt-3 text-[.85rem] text-ink-soft">
                Payments are handled by Razorpay. Cancel any time — your workspace
                stays up to the end of the period you paid for.
              </p>

              {status.kind === "none" && !profile?.promo ? (
                <div className="mt-5 border-t border-line-soft pt-4">
                  {!promoOpen ? (
                    <button
                      type="button"
                      onClick={() => setPromoOpen(true)}
                      className="cursor-pointer text-[.9rem] font-bold text-green-deep"
                    >
                      Have a promo code?
                    </button>
                  ) : (
                    <div>
                      <label htmlFor="promo-code" className="mb-1.5 block text-[.9rem] font-bold">
                        Promo code
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          id="promo-code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          placeholder="LAUNCH-2026"
                          autoComplete="off"
                          spellCheck={false}
                          className="allr-field w-[12rem] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => void redeem()}
                          disabled={redeeming || !promoCode.trim() || !nameReady}
                          className="cursor-pointer rounded-control border border-green-line bg-card px-4 py-2 text-[.92rem] font-bold text-green-deep hover:bg-green-tint disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {redeeming ? "Checking…" : "Start free month"}
                        </button>
                      </div>
                      <p className="mt-1.5 text-[.82rem] text-ink-soft">
                        {nameReady
                          ? "No payment details needed. Subscribe any time to keep your workspace after the free month."
                          : "Pick an available workspace name above first."}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          {message ? <p className="text-[.92rem] text-ink-soft">{message}</p> : null}

          <PaymentHistory history={history} />
        </div>
      )}
    </>
  );
}

function PaymentHistory({
  history,
}: {
  history: { items: HistoryItem[]; invoicesUnavailable: boolean } | null;
}) {
  if (!history) return null;
  const { items, invoicesUnavailable } = history;
  if (!items.length && !invoicesUnavailable) return null;
  return (
    <section className="rounded-card border border-line bg-card p-6 shadow-soft">
      <h2 className="mb-3 font-serif text-[1.2rem] text-ink">Payments</h2>
      {invoicesUnavailable ? (
        <p className="mb-3 text-[.88rem] text-ink-soft">
          Subscription receipts couldn’t be loaded from our payment provider just now. Try again in a moment.
        </p>
      ) : null}
      {items.length ? (
        <ul className="flex flex-col divide-y divide-line-soft">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[.92rem]">
              <span className="min-w-0">
                <span className="block font-bold text-ink">{i.description}</span>
                <span className="text-[.82rem] text-ink-soft">
                  {new Date(i.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  {i.status === "due" ? " · awaiting payment" : i.status === "failed" ? " · not paid" : ""}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-bold tabular-nums">{formatMoney(i.amountMinor, i.currency)}</span>
                {i.receiptUrl ? (
                  <a href={i.receiptUrl} target="_blank" rel="noreferrer" className="text-[.85rem] font-bold text-green-deep">
                    Receipt
                  </a>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function PlanSwitch({
  current,
  switching,
  billing,
  plans,
  now,
  busy,
  onSwitch,
  day,
}: {
  current: PlanKey;
  switching: { plan: PlanKey; kind: "upgrade" | "downgrade"; startsAt: string | null } | null;
  billing: NonNullable<BillingSummary["billing"]>;
  plans: BillingSummary["plans"];
  now: number;
  busy: boolean;
  onSwitch: (to: PlanKey) => void;
  day: (iso: string | null | undefined) => string | null;
}) {
  const card = "rounded-card border border-line bg-card p-6 shadow-soft";
  const name = (k: PlanKey) => plans.find((p) => p.key === k)?.name ?? k;
  if (switching) {
    return (
      <section className={card}>
        <p className="mb-1 font-bold text-ink">Switching to {name(switching.plan)}</p>
        <p className="text-[.92rem] leading-[1.7] text-ink-soft">
          {switching.kind === "upgrade"
            ? `Your AI credit is already on. From ${day(switching.startsAt) ?? "your renewal date"} you’ll pay the ${name(switching.plan)} price each month.`
            : `From ${day(switching.startsAt) ?? "your renewal date"} you’ll be on ${name(switching.plan)} and use your own AI key. Your AI credit lasts until then.`}
        </p>
      </section>
    );
  }
  const to: PlanKey = current === "workspace" ? "workspace_ai" : "workspace";
  const target = plans.find((p) => p.key === to);
  if (!target || !billing.currentPeriodEnd) return null;
  const end = new Date(billing.currentPeriodEnd);
  const start = billing.currentPeriodStart ? new Date(billing.currentPeriodStart) : new Date(end.getTime() - 30 * 86_400_000);
  const upgrade = to === "workspace_ai";
  const p = prorate(current, to, billing.planCurrency, start, end, new Date(now));
  return (
    <section className={card}>
      <p className="mb-1 font-bold text-ink">{upgrade ? `Upgrade to ${target.name}` : `Switch to ${target.name}`}</p>
      <p className="mb-4 text-[.92rem] leading-[1.7] text-ink-soft">
        {upgrade
          ? p.chargeMinor > 0
            ? `Pay ${formatMoney(p.chargeMinor, billing.planCurrency)} now for the rest of this cycle and get $${p.creditUsd.toFixed(2)} of AI credit until ${day(billing.currentPeriodEnd)}. From then, ${target.display}/month with $${target.aiUsd} of AI credit each month. Your billing date stays the same.`
            : `Your renewal is very close, so nothing is charged now: from ${day(billing.currentPeriodEnd)} you’ll be on ${target.name} at ${target.display}/month.`
          : `From ${day(billing.currentPeriodEnd)}, ${target.display}/month and you’ll use your own AI key (the Keys page in your workspace). Your AI credit lasts until then. Nothing is charged now.`}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!upgrade && !window.confirm(`Switch to ${target.name} on ${day(billing.currentPeriodEnd)}? Once set, this can’t be undone until it takes effect.`)) return;
          onSwitch(to);
        }}
        className={upgrade
          ? "cursor-pointer rounded-control bg-green px-5 py-2.5 text-[.95rem] font-bold text-white hover:bg-green-deep disabled:cursor-wait disabled:opacity-60"
          : "cursor-pointer rounded-control border border-line bg-card px-5 py-2.5 text-[.95rem] font-bold text-ink hover:border-honey-line disabled:cursor-wait disabled:opacity-60"}
      >
        {busy ? "Opening checkout…" : upgrade ? "Upgrade now" : "Switch at renewal"}
      </button>
    </section>
  );
}
