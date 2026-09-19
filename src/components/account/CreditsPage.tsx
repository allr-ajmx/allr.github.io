import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Where credit usage and top-ups will live.
 *
 * The free-week grant on Overview is informational only. Managing, buying, or
 * topping up credit is not open yet — and must not look like a checkout.
 */
export function CreditsPage() {
  return (
    <>
      <PageHeader eyebrow="Credits" title="Credit management">
        How much AI credit you have left, what used it, and how you will add
        more — when that is ready.
      </PageHeader>

      <ComingSoon what="Credit management isn’t open yet">
        Your free-week grant still applies while your workspace is open. There
        is nothing to buy or top up from here yet, and no meter that pretends
        otherwise. We will email you when you can manage credit yourself.
      </ComingSoon>
    </>
  );
}
