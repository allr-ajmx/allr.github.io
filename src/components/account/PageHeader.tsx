import { Pill } from "@/components/ui/Pill";

/** The title block every page in the shell starts with. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow && <Pill className="mb-4">{eyebrow}</Pill>}
      <h1 className="font-serif text-[1.85rem] leading-[1.18] text-ink">
        {title}
      </h1>
      {children && (
        <p className="mt-2 max-w-[52ch] text-[1.02rem] leading-[1.7] text-ink-soft">
          {children}
        </p>
      )}
    </header>
  );
}

/**
 * A page that has a place but not yet a purpose.
 *
 * Better than an empty screen and much better than a fake one: nothing here
 * pretends to be data. When the real content lands it replaces this outright.
 */
export function ComingSoon({
  what,
  children,
}: {
  what: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-card p-6 shadow-soft">
      <p className="mb-1.5 font-serif text-[1.2rem] text-ink">{what}</p>
      <p className="text-[.98rem] leading-[1.7] text-ink-soft">{children}</p>
    </div>
  );
}
