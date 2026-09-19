import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Memory that learns your work — planned, not shippable from this shell yet.
 */
export function MemoriesPage() {
  return (
    <>
      <PageHeader eyebrow="Memories" title="What Allr remembers">
        Preferences, context, and the things you have taught the workspace —
        gathered in one place so you can see and steer them.
      </PageHeader>

      <ComingSoon what="Memories aren’t open yet">
        Nothing is stored under this page today. When memory ships, this is
        where you will review and clear what Allr has learned from your work.
      </ComingSoon>
    </>
  );
}
