"use client";

import { PageHeader } from "./PageHeader";
import { WorkspaceAccess } from "./WorkspaceAccess";

/** The other doors into the same workspace: desktop and phone. */
export function AppsPage() {
  return (
    <>
      <PageHeader eyebrow="Apps" title="Your workspace, anywhere">
        The apps are free and open the same workspace you use on the web.
      </PageHeader>
      <WorkspaceAccess />
    </>
  );
}
