"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { CTA, WORDMARK } from "@/lib/brand";
import { cx } from "@/lib/cx";

const NAV_LINKS = [
  { href: "#publish", label: "It's live" },
  { href: "#how", label: "How it works" },
  { href: "#makes", label: "What it makes" },
  { href: "#phone", label: "On your phone" },
  { href: "#pricing", label: "Pricing" },
];

export function Header() {
  const [elevated, setElevated] = useState(false);

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
        elevated
          ? "border-line/80 bg-paper/92 shadow-[0_10px_30px_rgba(34,59,51,0.06)] backdrop-blur-[14px]"
          : "border-transparent",
      )}
    >
      <div className="wrap flex h-[74px] items-center justify-between">
        <a
          href="#top"
          className="inline-flex items-center gap-2 font-serif text-[1.55rem] no-underline transition-opacity duration-200 hover:opacity-80"
        >
          <Logo size={36} priority />
          {WORDMARK}
        </a>

        <nav
          className="hidden gap-7 text-[.98rem] font-bold text-ink-soft min-[721px]:flex"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link no-underline transition-colors duration-200 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Button href="#early-access" size="sm">
          {CTA.primary}
        </Button>
      </div>
    </header>
  );
}
