"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import {
  fetchBilling,
  fetchLedger,
  type LedgerSummary,
} from "@/lib/firebase/api";
import type { BillingSummary } from "@/lib/billing/model";
import { workspaceStatus, type WorkspaceStatus } from "@/lib/account/workspace-status";

/**
 * The landing page of the shell: where the workspace stands, what the plan is,
 * and how much AI credit is left. Everything renders from `workspaceStatus`,
 * the same answer Billing gives, so the two pages can never disagree.
 *
 * Downloads live under Apps; this page is about the workspace itself.
 */

const date = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : null;

const host = (username: string | null) => (username ? `${username}.allr.work` : "your workspace");

export function Overview() {
  const { profile, refresh } = useAuth();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerSummary | null>(null);
  /** Set when this visit watched the build finish, for the one-time "it's live". */
  const [justWentLive, setJustWentLive] = useState(false);
  const wasBuilding = useRef(false);

  const status = profile ? workspaceStatus(profile, billing?.provisioning ?? null) : null;

  useEffect(() => {
    let live = true;
    fetchBilling().then((b) => live && setBilling(b)).catch(() => {});
    fetchLedger().then((l) => live && setLedger(l.ledger ?? null)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // While it builds, look every few seconds; the moment the workspace exists,
  // reload the profile so every page flips to live together.
  const building = status?.kind === "building";
  // A stalled build waits on retries or a person: look once a minute, not
  // every five seconds, so a forgotten tab doesn't hammer the API.
  const pollMs = status?.kind === "building" && status.delayed ? 60_000 : 5_000;
  useEffect(() => {
    if (!building) return;
    wasBuilding.current = true;
    const t = setInterval(async () => {
      const next = await fetchBilling().catch(() => null);
      if (!next) return;
      setBilling(next);
      if (next.hasWorkspace) {
        await refresh();
        fetchLedger().then((l) => setLedger(l.ledger ?? null)).catch(() => {});
      }
    }, pollMs);
    return () => clearInterval(t);
  }, [building, pollMs, refresh]);

  useEffect(() => {
    if (status?.kind === "live" && wasBuilding.current) {
      wasBuilding.current = false;
      setJustWentLive(true);
    }
  }, [status?.kind]);

  if (!profile || !status) return null;
  const firstName = profile.name.trim().split(/\s+/)[0];

  return (
    <>
      <PageHeader eyebrow="Overview" title={firstName ? `Hello, ${firstName}` : "Hello"}>
        {lede(status)}
      </PageHeader>

      <div className="flex flex-col gap-5">
        <WorkspaceCard status={status} justWentLive={justWentLive} plan={billing?.plan ?? null} />

        {status.kind !== "none" && status.kind !== "building" ? (
          <div className="grid gap-5 min-[720px]:grid-cols-2">
            <PlanCard status={status} billing={billing} />
            <CreditsCard
              ledger={ledger}
              canTopUp={(status.kind === "live" && status.paid) || status.kind === "paymentDue" || (status.kind === "ending" && !status.over)}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

function lede(s: WorkspaceStatus): string {
  switch (s.kind) {
    case "none":
      return "Pick a name for your workspace and subscribe — it’s built for you in a few minutes.";
    case "building":
      return "Payment received. Your workspace is being built.";
    case "live":
      return s.paid
        ? "Your workspace is live."
        : s.promoEndsAt
          ? `Your workspace is live. Your free month runs until ${date(s.promoEndsAt)}.`
          : "Your workspace is live. It isn’t on a paid plan yet.";
    case "paymentDue":
      return "Your last payment didn’t go through. Your workspace is still up — fix it to keep it that way.";
    case "ending":
      return s.over
        ? "Your subscription has ended. Resubscribe to keep your workspace."
        : "Your subscription is cancelled. Your workspace stays up until the period you paid for ends.";
    case "paused":
      return s.resuming
        ? "Payment received — your workspace is coming back."
        : "Your workspace is paused. Nothing in it is lost.";
    case "trialEnded":
      return `Your free ${s.promo ? "month" : "week"} has ended. Subscribe to keep your workspace.`;
  }
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-card border border-line bg-card p-6 shadow-soft">{children}</section>;
}

function WorkspaceCard({
  status: s,
  justWentLive,
  plan,
}: {
  status: WorkspaceStatus;
  justWentLive: boolean;
  plan: BillingSummary["plan"] | null;
}) {
  if (s.kind === "none") {
    return (
      <Card>
        <h2 className="mb-1 font-serif text-[1.2rem] text-ink">Get your workspace</h2>
        <p className="mb-5 max-w-[56ch] text-[.96rem] leading-[1.7] text-ink-soft">
          One workspace of your own, with $20 of AI credit every month
          {plan ? ` — ${plan.display}/${plan.interval}` : ""}. Cancel any time. Have a
          promo code? Enter it when you choose a name.
        </p>
        <Button href="/account/billing/">Choose a name</Button>
      </Card>
    );
  }

  if (s.kind === "building") {
    return (
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-[1.2rem] text-ink">{host(s.username)}</h2>
          <Pill tone="honey">{s.delayed ? "Taking longer" : "Building"}</Pill>
        </div>
        <p className="max-w-[56ch] text-[.96rem] leading-[1.7] text-ink-soft">
          {s.delayed
            ? "Setup hit a snag. Your payment is safe and your name is held — we’ve been alerted and will finish it. There’s nothing you need to do."
            : "This usually takes a few minutes. This page updates itself — no need to refresh."}
        </p>
      </Card>
    );
  }

  const { tone, label } =
    s.kind === "live"
      ? { tone: "green" as const, label: s.promoEndsAt ? "Free month" : "Live" }
      : s.kind === "paymentDue"
        ? { tone: "honey" as const, label: "Payment due" }
        : s.kind === "ending"
          ? { tone: "honey" as const, label: s.over ? "Ended" : "Cancelled" }
          : s.kind === "paused"
            ? { tone: "honey" as const, label: s.resuming ? "Resuming" : "Paused" }
            : { tone: "honey" as const, label: s.promo ? "Free month ended" : "Free week ended" };
  const address = "address" in s ? s.address : null;
  const subscribeLabel =
    s.kind === "live" && !s.paid
      ? "Subscribe"
      : s.kind === "ending" && s.canResubscribe
        ? "Resubscribe"
        : (s.kind === "paused" && !s.resuming) || s.kind === "trialEnded"
          ? "Subscribe to bring it back"
          : null;

  return (
    <Card>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-[1.2rem] text-ink">{host(s.username)}</h2>
        <Pill tone={tone}>{label}</Pill>
      </div>

      {justWentLive && s.kind === "live" ? (
        <p className="mb-4 text-[.98rem] font-bold text-green-deep">
          Your workspace is live. Open it and start building.
        </p>
      ) : null}

      <p className="mb-5 max-w-[60ch] text-[.96rem] leading-[1.7] text-ink-soft">{detail(s)}</p>

      <div className="flex flex-wrap gap-3">
        {address ? (
          <Button href={address} variant={s.kind === "live" ? "green" : "ghost"}>
            Open workspace
          </Button>
        ) : null}
        {s.kind === "paymentDue" ? <Button href="/account/billing/">Fix payment</Button> : null}
        {subscribeLabel ? (
          <Button href="/account/billing/" variant={s.kind === "live" ? "ghost" : "green"}>
            {subscribeLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function detail(s: Exclude<WorkspaceStatus, { kind: "none" } | { kind: "building" }>): string {
  switch (s.kind) {
    case "live":
      return s.paid
        ? "Everything you make in it can be published from there."
        : s.promoEndsAt
          ? `Subscribe before ${date(s.promoEndsAt)} to keep it running after the free month.`
          : "Subscribe to keep it running — your work stays exactly where it is.";
    case "paymentDue":
      return "If the payment isn’t fixed soon, the workspace is paused until it is.";
    case "ending": {
      const end = date(s.endsAt);
      if (s.over) return "The period you paid for is over, so the workspace is about to pause. Resubscribe and it keeps running.";
      return end
        ? `No further charges. It stays up until ${end}${s.canResubscribe ? "." : " — you can subscribe again once it ends."}`
        : "It stays up until the end of the period you paid for.";
    }
    case "paused": {
      if (s.resuming) return "Your payment went through. The workspace is being started again — usually within a few minutes.";
      if (s.cause === "trial") return "Your free week ended. Subscribe and it comes straight back, just as you left it.";
      const removal = date(s.removeAfter);
      const why = s.cause === "cancelled" ? "Paused because your subscription ended." : "Paused because payment didn’t go through.";
      return removal
        ? `${why} Subscribe and it comes straight back — otherwise it is removed on ${removal}.`
        : `${why} Subscribe and it comes straight back.`;
    }
    case "trialEnded":
      return "Subscribe and keep everything in it.";
  }
}

function PlanCard({ status: s, billing }: { status: WorkspaceStatus; billing: BillingSummary | null }) {
  const plan = billing?.plan;
  const line =
    s.kind === "live" && s.paid
      ? s.renewsAt
        ? `Renews ${date(s.renewsAt)}`
        : "Active"
      : s.kind === "ending"
        ? s.over
          ? "Ended"
          : `Cancelled · ends ${date(s.endsAt) ?? "at the end of the paid period"}`
        : s.kind === "paymentDue"
          ? "Last payment failed"
          : s.kind === "paused" && s.resuming
            ? "Paid · resuming"
            : s.kind === "live" && s.promoEndsAt
              ? `Free month · until ${date(s.promoEndsAt)}`
              : "No active subscription";
  return (
    <Card>
      <p className="mb-1 text-[.78rem] font-bold tracking-[0.05em] text-ink-soft uppercase">Plan</p>
      <p className="text-[1.35rem] font-bold text-ink">
        {plan ? `${plan.display}` : "—"}
        {plan ? <span className="text-[.95rem] font-semibold text-ink-soft">/{plan.interval}</span> : null}
      </p>
      {line ? <p className="mt-1 text-[.9rem] text-ink-soft">{line}</p> : null}
      <Link href="/account/billing/" className="mt-4 inline-block text-[.92rem] font-bold text-green-deep">
        Billing and payments →
      </Link>
    </Card>
  );
}

function CreditsCard({ ledger, canTopUp }: { ledger: LedgerSummary | null; canTopUp: boolean }) {
  const money = (n: number) => `$${n.toFixed(2)}`;
  return (
    <Card>
      <p className="mb-1 text-[.78rem] font-bold tracking-[0.05em] text-ink-soft uppercase">AI credit</p>
      {ledger ? (
        <>
          <p className="text-[1.35rem] font-bold text-ink">
            {money(ledger.remaining.includedUsd + ledger.remaining.grantsUsd + ledger.remaining.topupUsd)}
            <span className="text-[.95rem] font-semibold text-ink-soft"> left</span>
          </p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-line-soft"
            role="img"
            aria-label={`${money(ledger.remaining.includedUsd)} of ${money(ledger.includedUsd)} monthly credit left`}
          >
            <div
              className="h-full rounded-full bg-honey transition-[width] duration-500"
              style={{ width: `${Math.min(100, (ledger.remaining.includedUsd / Math.max(1, ledger.includedUsd)) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[.88rem] text-ink-soft">
            {money(ledger.remaining.includedUsd)} of {money(ledger.includedUsd)} this month
            {ledger.remaining.grantsUsd > 0 ? ` · ${money(ledger.remaining.grantsUsd)} bonus` : ""}
            {ledger.remaining.topupUsd > 0 ? ` · ${money(ledger.remaining.topupUsd)} from packs` : ""}
          </p>
        </>
      ) : (
        <p className="text-[.92rem] text-ink-soft">Your credit meter appears once the workspace is set up.</p>
      )}
      <Link href="/account/credits/" className="mt-4 inline-block text-[.92rem] font-bold text-green-deep">
        {canTopUp ? "Add credit →" : "Credit details →"}
      </Link>
    </Card>
  );
}
