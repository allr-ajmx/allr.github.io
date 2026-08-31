"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AllrMark } from "@/components/ui/AllrMark";
import { rotationToPoint } from "@/lib/petals";
import { CTA, WORDMARK } from "@/lib/brand";
import { cx } from "@/lib/cx";

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
  const [elevated, setElevated] = useState(false);
  const [petal, setPetal] = useState<number | undefined>(undefined);

  // Light the petal of whichever section is under the middle of the screen.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-petal]"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) setPetal(Number(el.dataset.petal));
          else setPetal((cur) => (cur === Number(el.dataset.petal) ? undefined : cur));
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    els.forEach((el) => io.observe(el));
    // The Bloom section changes its data-petal as you scroll; re-read it.
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        const el = m.target as HTMLElement;
        const r = el.getBoundingClientRect();
        const mid = window.innerHeight / 2;
        if (r.top <= mid && r.bottom >= mid) setPetal(Number(el.dataset.petal));
      }
    });
    els.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ["data-petal"] }));
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  useEffect(() => {
    const onScroll = () => setElevated(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        // Transparent at the top so it belongs to the hero; solid once you scroll.
        "sticky top-0 z-50 border-b-[1.5px] transition-[box-shadow,background-color,border-color] duration-300",
        // Frosted, not opaque: a light tint over a strong blur, so the page
        // shows through as colour while the header stays readable.
        elevated
          ? "border-line/60 bg-paper/55 shadow-[0_10px_30px_rgba(34,59,51,0.05)] backdrop-blur-[22px] backdrop-saturate-[1.4]"
          : "border-transparent",
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
