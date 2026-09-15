import { ComingSoon, PageHeader } from "./PageHeader";

/**
 * Third-party connections — a place held open, not a fake list of apps.
 */
export function IntegrationsPage() {
  return (
    <>
      <PageHeader eyebrow="Integrations" title="Connect other tools">
        Link the services you already use so finished work can move in and out
        of Allr without a copy-paste detour.
      </PageHeader>

      <ComingSoon what="Integrations aren’t open yet">
        There are no connectors to turn on here. When they arrive, they will
        list themselves honestly — with a clear off switch for each one.
      </ComingSoon>
    </>
  );
}
