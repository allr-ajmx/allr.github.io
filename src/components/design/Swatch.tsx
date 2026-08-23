import { CopyChip } from "@/components/design/CopyChip";
import { cx } from "@/lib/cx";

export function Swatch({
  token,
  hex,
  meaning,
  className,
}: {
  token: string;
  hex: string;
  meaning: string;
  className: string;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
      <div className={cx("h-20 border-b border-line-soft", className)} />
      <div className="flex flex-col gap-1.5 px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-serif text-[1.05rem]">{token}</span>
          <CopyChip value={hex} />
        </div>
        <CopyChip value={token} label={`--color-${token}`} />
        <p className="text-[.82rem] leading-snug text-ink-soft">{meaning}</p>
      </div>
    </div>
  );
}
