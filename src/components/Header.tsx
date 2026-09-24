"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AllrMark } from "@/components/ui/AllrMark";
import { CTA, WORDMARK } from "@/lib/brand";
import { AUTH_CONFIGURED, FIREBASE_API_KEY } from "@/lib/firebase/env";

/**
 * Landing section anchors use site-root paths so they work from /download too.
 * /app and /roadmap stay out of marketing nav (stubs).
 */
const NAV_LINKS = [
  { href: "/#provide", label: "What you get" },
  { href: "/#loop", label: "How it works" },
  { href: "/#progress", label: "Platform" },
  { href: "/#access", label: "Where to use it" },
  { href: "/download", label: "Download" },
];

const CTA_CLASS =
  "inline-flex items-center justify-center rounded-control bg-green px-4 py-2 text-[.92rem] font-bold text-white no-underline shadow-[0_8px_20px_rgba(46,158,99,.28)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-green-deep";

/**
 * Whether Firebase Auth already has a persisted session in this browser.
 *
 * The header must not import the Firebase SDK — marketing pages stay free of
 * it (`scripts/check-bundle-isolation.mjs`). `browserLocalPersistence` leaves
 * a `firebase:authUser:<apiKey>:…` key in localStorage; reading that key is
 * enough to swap Get Started for Home without loading Auth.
 */
function readSignedIn(): boolean {
  if (!AUTH_CONFIGURED || !FIREBASE_API_KEY || typeof window === "undefined") {
    return false;
  }
  try {
    const prefix = `firebase:authUser:${FIREBASE_API_KEY}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const raw = localStorage.getItem(key);
      return Boolean(raw && raw !== "null");
    }
  } catch {
    return false;
  }
  return false;
}

export function Header() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => setSignedIn(readSignedIn());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return (
    <header className="header-bar header-bar--on sticky top-0 z-50">
      <div className="wrap flex h-[74px] items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-serif text-[1.55rem] no-underline transition-opacity duration-200 hover:opacity-80"
        >
          <AllrMark size={36} />
          {WORDMARK}
        </Link>

        <nav
          className="hidden gap-7 text-[.98rem] font-bold text-ink-soft min-[721px]:flex"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link no-underline transition-colors duration-200 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {signedIn ? (
            <Link href="/account/" className={CTA_CLASS}>
              Home
            </Link>
          ) : (
            <Link href="/login/" className={CTA_CLASS}>
              {CTA.getStarted}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
