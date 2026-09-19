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

/**
 * The same row, where more than one answer is true at once.
 *
 * A separate component rather than a mode on `ChoiceChips`, because the two
 * differ in more than their value: these are checkboxes in behaviour, so they
 * report `aria-pressed` per chip and a tap toggles rather than replaces. Given
 * one control that quietly did both, a caller would eventually pass the wrong
 * one and get a picker that silently loses answers.
 */
export function ChoiceChipsMulti<T extends string>({
  legend,
  options,
  values,
  onChange,
  className,
}: {
  legend: string;
  options: readonly { id: T; label: string }[];
  values: readonly T[];
  onChange: (values: T[]) => void;
  className?: string;
}) {
  const toggle = (id: T) =>
    onChange(
      values.includes(id) ? values.filter((v) => v !== id) : [...values, id],
    );

  return (
    <fieldset className={cx("flex flex-wrap items-center gap-2", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const on = values.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            aria-pressed={on}
            className={cx(
              "inline-flex cursor-pointer items-center gap-2 rounded-chip border px-3.5 py-1.5 text-[.85rem] font-bold transition-colors duration-200",
              on
                ? "border-green-line bg-green-tint text-green-deep"
                : "border-line text-ink-soft hover:border-[#D8CFBB] hover:text-ink",
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                "grid size-[.95rem] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors duration-150",
                on ? "border-green bg-green" : "border-line",
              )}
            >
              {on && (
                <svg viewBox="0 0 12 10" className="size-[.6rem] text-white">
                  <path
                    d="M1 5.2 4.4 8.6 11 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
