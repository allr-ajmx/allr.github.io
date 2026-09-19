import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Managing products built in the Allr workspace.
 *
 * Direction (for later product work): Allr is evolving into a business-
 * intelligence workspace — onboard, run AI workflows and integrations on the
 * cloud around the clock, and manage what you build so an idea can reach the
 * public without rebuilding everything from scratch. This page is the shelf
 * for that product surface; nothing here is live yet.
 */
export function ProductsPage() {
  return (
    <>
      <PageHeader eyebrow="Products" title="Product management">
        Everything you build in Allr, in one place — so you can move from an
        idea to something the public can use without rebuilding the stack each
        time.
      </PageHeader>

      <div className="flex flex-col gap-4">
        <ComingSoon what="Product management isn’t open yet">
          There is no catalogue of products to edit here today. When this lands,
          it will be where you onboard what you have made and keep it ready to
          ship.
        </ComingSoon>
        <ComingSoon what="From idea to public">
          The aim is a short path: shape the product in the workspace, then take
          it out to people — without spending the season wiring hosting,
          plumbing, and glue.
        </ComingSoon>
        <ComingSoon what="Tied to your workspace">
          Products will sit alongside the AI workflows and integrations that
          keep them running, so what you manage here matches what is already
          live in the cloud.
        </ComingSoon>
      </div>
    </>
  );
}
