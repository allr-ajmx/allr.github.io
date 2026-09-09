import { cx } from "@/lib/cx";

/**
 * `.allr-field` as a `<select>`. The arrow and the reset live in `globals.css`
 * so the control matches an `<input>` exactly on every platform.
 *
 * There is no built-in empty option: a select that starts on a real value has
 * already answered for the person. Pass `placeholder` and it renders a disabled
 * first option instead, so an untouched field fails `required`.
 */
export function Select({
  placeholder,
  dense,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
  dense?: boolean;
}) {
  return (
    <select
      {...props}
      className={cx(
        "allr-field",
        dense && "allr-field--dense",
        // An unchosen select should not look as settled as a chosen one.
        !props.value && "text-ink-soft",
        className,
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}
