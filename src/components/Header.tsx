import { Button } from "@/components/ui/Button";

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
          <span
            className="inline-flex size-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_30%,#F6C56B,var(--color-honey)_55%,var(--color-honey-deep))] text-[1.05rem] text-white shadow-[0_6px_16px_rgba(233,168,62,.4)]"
            aria-hidden="true"
          >
            ✦
          </span>
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

        <Button href="#final" size="sm">
          Start creating free
        </Button>
      </div>
    </header>
  );
}
