"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AllrMark } from "@/components/ui/AllrMark";
import { rotationToPoint } from "@/lib/petals";
import { CTA, WORDMARK } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { ScrollTrigger } from "@/lib/motion";
import { getFocusedPetal, getFocusedPetalServer, subscribeFocusedPetal } from "@/lib/petalFocus";

/**
 * The header rides on `/app` and `/download` as well as the landing, so every
 * section link is written from the site root. A bare `#publish` resolves
 * against the current page — on `/app` it becomes `/app#publish`, an anchor
 * that does not exist there, and the click does nothing at all.
 */
const NAV_LINKS = [
  { href: "/#publish", label: "It's live" },
  { href: "/#how", label: "How it works" },
  { href: "/#makes", label: "What it makes" },
  { href: "/#phone", label: "On your phone" },
  { href: "/app", label: "The app" },
];

export function Header() {
  // The tracking mark belongs to the landing page, where the Bloom is what it
  // is tracking. Everywhere else the logo is just the logo and must not move:
  // `/app` sets `data-petal` on four of its sections, which would otherwise
  // turn and dim the mark as you scroll a page that has no Bloom to explain it.
  const isHome = usePathname() === "/";
  const [elevated, setElevated] = useState(false);
  const [sectionPetal, setSectionPetal] = useState<number | undefined>(undefined);
  // The Bloom changes petal continuously as you scroll it, so it tells us
  // rather than us watching its `data-petal` attribute for changes.
  const bloomPetal = useSyncExternalStore(
    subscribeFocusedPetal,
    getFocusedPetal,
    getFocusedPetalServer,
  );
  const petal = isHome ? bloomPetal ?? sectionPetal : undefined;

  // Light the petal of whichever static section is under the middle of the
  // screen. These never change their attribute once rendered.
  useEffect(() => {
    if (!isHome) return;
    if (!("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-petal]"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) setSectionPetal(Number(el.dataset.petal));
          else setSectionPetal((cur) => (cur === Number(el.dataset.petal) ? undefined : cur));
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isHome]);

  useEffect(() => {
    // One scroll authority: the same ScrollTrigger instance that drives every
    // reveal and parallax on the page also decides when the bar lifts.
    const st = ScrollTrigger.create({
      start: 8,
      onUpdate: (self) => setElevated(self.scroll() > 8),
      // ScrollTrigger refreshes on creation, so this also sets the state
      // for a page restored mid-scroll.
      onRefresh: (self) => setElevated(self.scroll() > 8),
    });
    return () => st.kill();
  }, []);

  return (
    <header
      className={cx(
        // Transparent at the top so it belongs to the hero; solid once you scroll.
        "header-bar sticky top-0 z-50 transition-[background-color] duration-300",
        // Frosted, not opaque: a light tint over a strong blur, so the page
        // shows through as colour while the header stays readable.
        elevated && "header-bar--on",
      )}
    >
      <div className="wrap flex h-[74px] items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-serif text-[1.55rem] no-underline transition-opacity duration-200 hover:opacity-80"
        >
          <AllrMark size={36} highlight={petal} rotate={petal !== undefined ? rotationToPoint(petal, -90) : 0} />
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

        <Link href="/#early-access" className="inline-flex items-center justify-center rounded-control bg-green px-4 py-2 text-[.92rem] font-bold text-white no-underline shadow-[0_8px_20px_rgba(46,158,99,.28)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-green-deep">
          {CTA.primary}
        </Link>
      </div>
    </header>
  );
}
