import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ETYMOLOGY, WORDMARK } from "@/lib/brand";

export function Footer() {
  return (
    <footer className="relative px-6 pt-[58px] pb-[66px] text-center font-bold text-ink-soft">
      <div className="mb-3 font-serif text-[1.25rem] text-ink">
        {WORDMARK} — as in <em className="not-italic text-green-deep">all</em>.
      </div>
      <nav
        className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[.92rem]"
        aria-label="Footer"
      >
        <Link href="/#makes" className="text-ink-soft no-underline hover:text-ink">
          What it makes
        </Link>
        <Link href="/#how" className="text-ink-soft no-underline hover:text-ink">
          How it works
        </Link>
        <Link href="/app" className="text-ink-soft no-underline hover:text-ink">
          The app
        </Link>
        <Link
          href="/#early-access"
          className="text-ink-soft no-underline hover:text-ink"
        >
          Early access
        </Link>
      </nav>
      <div className="flex items-center justify-center gap-2">
        Made for people with things to ship.
        <Logo size={18} />
      </div>
      <p className="sr-only">{ETYMOLOGY}</p>
    </footer>
  );
}
