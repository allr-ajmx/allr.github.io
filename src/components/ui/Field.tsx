"use client";

import { useId } from "react";
import { cx } from "@/lib/cx";

/**
 * A labelled form control.
 *
 * The site's one form until now — `WaitlistForm` — asks for a single email and
 * gets away with an `sr-only` label and a placeholder. A registration form
 * cannot: a placeholder disappears the moment you type, and "what was this box
 * for again?" is exactly the question a legal-name or country field must
 * never provoke. So the label is visible, the hint sits under it, and the error
 * replaces nothing — it is added below, so the field never loses its name.
 *
 * `children` is a render prop rather than a bare `ReactNode` because the ids
 * tying the label, the hint and the error to the control are minted here; the
 * caller would otherwise have to invent and thread three of them per field.
 */
export function Field({
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  /** Marks the control required. Renders nothing — see `optional`. */
  required?: boolean;
  /** Say "optional" out loud instead of starring the other nine fields. */
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
    required: boolean | undefined;
  }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 text-[.92rem] font-bold text-ink"
      >
        {label}
        {optional && (
          <span className="text-[.8rem] font-semibold text-ink-soft">
            optional
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-[.86rem] leading-snug text-ink-soft">
          {hint}
        </p>
      )}

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required: required || undefined,
      })}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[.86rem] font-semibold text-alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
