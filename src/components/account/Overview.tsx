"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { CreditBar } from "./CreditBar";
import { WorkspaceAccess } from "./WorkspaceAccess";
import { ComingSoon, PageHeader } from "./PageHeader";
import { RequestEarlyAccess } from "./RequestEarlyAccess";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { fetchCredits, type CreditResponse } from "@/lib/firebase/api";

/**
 * The landing page of the shell, which is really four pages.
 *
 * What somebody sees is decided by where they are in the early-access journey,
 * not by the route — there is nothing to navigate between, because only one of
 * these is ever true at a time.
 */
export function Overview() {
  const { profile, status } = useAuth();
  const firstName = profile?.name.trim().split(/\s+/)[0];

  // A brand-new account has not asked for anything yet, and being shown a
  // waiting screen for a queue you never joined would be a lie.
  if (status === "registered") return <RequestEarlyAccess />;

  if (status === "requested") {
    return (
      <>
        <PageHeader
          eyebrow="Early access"
          title={firstName ? `Thanks, ${firstName}` : "Thanks"}
        >
          Your request is in. We open workspaces in batches, and we will email
          you the moment yours is ready — there is nothing else you need to do.
        </PageHeader>

        <div className="flex flex-col gap-4">
          <ComingSoon what="What happens next">
            When your workspace opens you get a free week with $5 of AI credit,
            and the desktop and phone builds unlock at the same time.
          </ComingSoon>
          <ComingSoon what="While you wait">
            Your details are saved. You can change them under Profile whenever
            you like.
          </ComingSoon>
        </div>
      </>
    );
  }

  return <LiveOverview firstName={firstName} ended={status === "trialEnded"} />;
}

function LiveOverview({
  firstName,
  ended,
}: {
  firstName: string | undefined;
  ended: boolean;
}) {
  const [credits, setCredits] = useState<CreditResponse | null>(null);

  useEffect(() => {
    let live = true;
    fetchCredits()
      .then((c) => live && setCredits(c))
      // The bar is not worth an error screen: the rest of the page still works.
      .catch(() => live && setCredits(null));
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        eyebrow={ended ? "Free week over" : "Your workspace"}
        title={firstName ? `Hello, ${firstName}` : "Hello"}
      >
        {ended
          ? "Your free week has ended. Your work is safe and nothing has been deleted — add a payment method to pick up where you left off."
          : "Your workspace is open. Anything you make in it can be published from here."}
      </PageHeader>

      <div className="flex flex-col gap-5">
        {ended ? (
          <section className="rounded-card border border-honey-line bg-honey-tint p-6">
            <Pill tone="honey" className="mb-3">
              Time to decide
            </Pill>
            <h2 className="mb-2 font-serif text-[1.3rem] text-ink">
              Keep your workspace
            </h2>
            <p className="mb-5 max-w-[52ch] text-[1rem] leading-[1.7] text-ink-soft">
              One plan, everything in it. Your sites, decks, sheets, docs, video
              and apps stay exactly where you left them.
            </p>
            <Button href="/account/billing/" size="lg">
              Pay now
            </Button>
          </section>
        ) : (
          credits?.credit && (
            <CreditBar
              grantedUsd={credits.credit.grantedUsd}
              usedUsd={credits.credit.usedUsd}
              daysLeft={credits.credit.daysLeft}
              mocked={credits.mocked}
            />
          )
        )}

        <WorkspaceAccess />
      </div>
    </>
  );
}
