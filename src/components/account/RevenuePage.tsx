import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Revenue and business signal for products running in the workspace.
 *
 * Same product direction as Product management: a business-intelligence
 * workspace where workflows run continuously and products reach the public
 * quickly. This page will hold the money and traction view; checkout and
 * payment controls stay off until self-serve billing is ready.
 */
export function RevenuePage() {
  return (
    <>
      <PageHeader eyebrow="Revenue" title="Revenue">
        How the products you run in Allr are doing — traction, earnings, and
        the signals that tell you what to ship next.
      </PageHeader>

      <div className="flex flex-col gap-4">
        <ComingSoon what="Revenue isn’t open yet">
          There are no charts or payouts on this page today. When it opens, it
          will show what your products earn and where that money comes from —
          without a fake dashboard in the meantime.
        </ComingSoon>
        <ComingSoon what="Business intelligence">
          The workspace is meant to help you see the business side of what you
          build: which products move, which workflows matter, and where to put
          the next hour of work.
        </ComingSoon>
        <ComingSoon what="No checkout here">
          Paying for Allr itself stays under Billing when that is ready. This
          page is about the revenue of *your* products, not a place to enter a
          card.
        </ComingSoon>
      </div>
    </>
  );
}
