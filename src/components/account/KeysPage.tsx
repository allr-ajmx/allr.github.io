import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * API and access keys — deferred until there is something to issue.
 */
export function KeysPage() {
  return (
    <>
      <PageHeader eyebrow="Keys" title="Key management">
        Create and revoke keys for anything that talks to your workspace on
        your behalf.
      </PageHeader>

      <ComingSoon what="Key management isn’t open yet">
        There are no keys to issue or revoke from this page. When that lands,
        every key will be named, dated, and easy to shut off.
      </ComingSoon>
    </>
  );
}
