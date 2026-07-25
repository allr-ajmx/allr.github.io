import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "#makes", label: "What it makes" },
  { href: "#how", label: "How it works" },
  { href: "#who", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b-[1.5px] border-line-soft bg-paper/90 backdrop-blur-[10px]">
      <div className="wrap flex h-[74px] items-center justify-between">
        <a
          href="#top"
          className="inline-flex items-center gap-2 font-serif text-[1.55rem] no-underline"
        >
          <Logo size={36} priority />
          allr
        </a>

        <nav
          className="hidden gap-7 text-[.98rem] font-bold text-ink-soft min-[721px]:flex"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="no-underline hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Button size="sm">Coming soon</Button>
      </div>
    </header>
  );
}
