"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";

/**
 * A consent tick.
 *
 * The whole row is the hit target, and the box is drawn rather than styled:
 * a native checkbox cannot be given a 1.5px paper-edge border and a honey focus
 * ring consistently across browsers, and consent is precisely the control you
 * do not want rendered differently for some people than others.
 *
 * The input itself stays in the DOM — `peer`, not `hidden` — so it keeps its
 * keyboard behaviour, its label association and its place in the tab order.
 */
export function Checkbox({
  label,
  hint,
  error,
  checked,
  onChange,
  required,
  name,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  name?: string;
  className?: string;
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.currentTarget.checked)}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className={cx(
            "mt-px grid size-[1.15rem] shrink-0 cursor-pointer place-items-center rounded-[6px] border-[1.5px] bg-card transition-colors duration-150",
            "peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-honey",
            "peer-checked:border-green peer-checked:bg-green peer-checked:[&>svg]:opacity-100",
            error ? "border-alert" : "border-line",
          )}
        >
          <svg
            viewBox="0 0 12 10"
            aria-hidden="true"
            className="size-[.7rem] text-white opacity-0 transition-opacity duration-150"
          >
            <path
              d="M1 5.2 4.4 8.6 11 2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </label>
        <label
          htmlFor={id}
          className="cursor-pointer text-[.94rem] leading-snug font-semibold text-ink"
        >
          {label}
        </label>
      </div>

      {hint && (
        <p id={hintId} className="pl-[1.9rem] text-[.86rem] leading-snug text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="pl-[1.9rem] text-[.86rem] font-semibold text-alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
