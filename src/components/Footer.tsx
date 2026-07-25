import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="px-6 pt-[58px] pb-[66px] text-center font-bold text-ink-soft">
      <div className="mb-2 font-serif text-[1.25rem] text-ink">
        allr — as in <em className="not-italic text-green-deep">all</em>.
      </div>
      <div className="flex items-center justify-center gap-2">
        Made for people with things to ship.
        <Logo size={18} />
      </div>
    </footer>
  );
}
