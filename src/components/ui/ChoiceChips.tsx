"use client";

import { cx } from "@/lib/cx";

/**
 * A row of chips where exactly one is chosen — the pattern the mobile-beta
 * platform picker inlines in `WaitlistForm`, lifted out so a second form does
 * not copy it.
 *
 * These are `aria-pressed` buttons rather than radios on purpose: the chip row
 * is a small set of visible, equally-weighted answers, and a button reads its
 * own pressed state to a screen reader without needing a roving tabindex.
 * The `<legend>` is what says the question out loud.
 */
export function ChoiceChips<T extends string>({
  legend,
  options,
  value,
  onChange,
  className,
}: {
  legend: string;
  options: readonly { id: T; label: string }[];
  value: T | undefined;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={cx("flex flex-wrap items-center gap-2", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={cx(
            "cursor-pointer rounded-chip border px-3.5 py-1.5 text-[.85rem] font-bold transition-colors duration-200",
            value === option.id
              ? "border-green-line bg-green-tint text-green-deep"
              : "border-line text-ink-soft hover:border-[#D8CFBB] hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
