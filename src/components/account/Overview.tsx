"use client";

import { useAuth } from "./AuthProvider";
import { ComingSoon, PageHeader } from "./PageHeader";

/** The landing page of the shell. Its real content is a later design pass. */
export function Overview() {
  const { profile } = useAuth();
  // The legal name is the one we hold; the first word of it is the one to
  // greet somebody by.
  const firstName = profile?.legalName.trim().split(/\s+/)[0];

  return (
    <>
      <PageHeader eyebrow="Overview" title={firstName ? `Hello, ${firstName}` : "Hello"}>
        Your account is set up. There is nothing to do here yet — this is where
        your work will appear once the workspace opens.
      </PageHeader>

      <div className="flex flex-col gap-4">
        <ComingSoon what="Your workspace">
          The one place that takes an idea and hands back something finished.
          You are on the list; we will write when it is ready for you.
        </ComingSoon>
        <ComingSoon what="What you’ve made">
          Every site, deck, sheet, doc, video and app you ship, with its live
          link and every version behind it.
        </ComingSoon>
      </div>
    </>
  );
}
