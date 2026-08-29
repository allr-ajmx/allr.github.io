"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { APP } from "@/lib/brand";
import {
  detectPlatform,
  fetchLatestRelease,
  PLATFORM_LABELS,
} from "@/lib/releases";

/** The detected platform never changes during a session, so nothing to watch. */
const noopSubscribe = () => () => {};

/**
 * The hero's download call to action.
 *
 * It does not link to an asset: every download button on this page sends you to
 * `/download`, which is where the builds, the formats and the requirements
 * live. All this needs from the release is the version to name.
 *
 * `version` is read at build time so the exported HTML already names a real
 * release — the page works with JavaScript disabled. On mount we re-fetch, which
 * picks up a release published since the last site build, and quietly keeps the
 * build-time value if that fails.
 */
export function DownloadRow({ version }: { version: string | null }) {
  const [shown, setShown] = useState(version);

  // Reading `navigator` is a browser-only concern, so it goes through
  // useSyncExternalStore rather than an effect: the server snapshot is
  // undefined, which keeps the prerendered markup and the first client render
  // identical.
  const detected = useSyncExternalStore(
    noopSubscribe,
    () => detectPlatform(),
    () => undefined,
  );

  useEffect(() => {
    let live = true;
    fetchLatestRelease().then((fresh) => {
      if (live && fresh) setShown(fresh.version);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="w-full max-w-[500px]">
      <Button href="/download" size="lg">
        <DownloadIcon />
        {/* Named for your platform once we know it; plain until then, which is
            also what the server rendered. */}
        {detected
          ? APP.download.forPlatform(PLATFORM_LABELS[detected])
          : APP.download.anyPlatform}
      </Button>

      <p className="mt-4 text-[.9rem] text-ink-soft">
        {`${shown ? APP.download.version(shown) : APP.download.versionUnknown} · ${APP.download.free}`}
      </p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
      aria-hidden="true"
    >
      <path d="M12 4v11" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}
