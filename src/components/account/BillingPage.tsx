import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Nothing to bill yet, and the page says exactly that.
 *
 * The client app is free forever; the agent workspace is the plan (DESIGN.md
 * §16). This page will only ever be about the second of those, and it must
 * never imply the app costs money. Self-serve checkout is deferred — no pay
 * button, no manual payment CTA.
 */
export function BillingPage() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="Paying for your workspace">
        The Allr app is free and stays free. The workspace it connects to is the
        plan — and this is where it will be paid for.
      </PageHeader>

      <ComingSoon what="Checkout isn’t open yet">
        There is no payment page to send you to. We will email you the moment
        self-serve billing opens.
      </ComingSoon>
    </>
  );
}
