import { ComingSoon, PageHeader } from "./PageHeader";
import { CONTACT_EMAIL } from "@/lib/legal";
import { Button } from "@/components/ui/Button";

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
      <PageHeader eyebrow="Billing" title="Paying for your workspace">
        The Allr app is free and stays free. The workspace it connects to is the
        plan — and this is where it will be paid for.
      </PageHeader>

      <ComingSoon what="Checkout isn’t open yet">
        There is no payment page to send you to, so rather than a button that
        goes nowhere: your workspace stays exactly as you left it, and nothing
        is deleted while we get this ready. We will email you the moment you can
        pay.
      </ComingSoon>

      <div className="mt-5">
        <p className="mb-3 text-[.96rem] leading-[1.7] text-ink-soft">
          Need it sooner, or want to sort it out by hand?
        </p>
        <Button
          href={`mailto:${CONTACT_EMAIL}?subject=Paying%20for%20my%20workspace`}
          variant="ghost"
        >
          Write to us
        </Button>
      </div>
    </>
  );
}
