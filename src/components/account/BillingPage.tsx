import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Nothing to bill yet, and the page says exactly that.
 *
 * The client app is free forever; the agent workspace is the plan (DESIGN.md
 * §16). This page will only ever be about the second of those, and it must
 * never imply the app costs money.
 */
export function BillingPage() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="Nothing to pay">
        The Allr app is free and stays free. When the workspace opens, this is
        where its plan and receipts will live.
      </PageHeader>

      <ComingSoon what="Your plan">
        We will ask for a billing address and payment details at checkout — not
        before. Until then there is nothing here to manage.
      </ComingSoon>
    </>
  );
}
