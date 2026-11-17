"use client";

import { useEffect } from "react";

/**
 * Run `fn` every `ms` while the tab is visible, and once more the moment it
 * comes back into view — so a meter left open keeps up with the usage the
 * platform reports (about every five minutes) without a forgotten background tab
 * calling the API.
 */
export function useWhileVisible(fn: () => void, ms: number) {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") fn();
    };
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fn, ms]);
}
