/**
 * The age gate.
 *
 * Allr is strictly an above-contract-age product (DESIGN.md §16), so this is
 * the code that decides whether somebody may hold an account at all. It lives
 * on its own, importing nothing but the threshold, for two reasons: the
 * Firestore rules can only approximate it (rules have durations, not a
 * calendar), and a function this consequential should be testable without a
 * browser, a bundler or an emulator in the way.
 *
 * Everything here works in UTC. `new Date("1990-05-04")` is parsed as UTC but
 * `new Date(1990, 4, 4)` is local, and mixing the two puts a birthday a day out
 * for anyone west of Greenwich — which, on a date that decides eligibility, is
 * a day that matters.
 */

/**
 * The age of contract. Defined here rather than in `legal.ts` so that this
 * module imports nothing at all — which is what lets `node --test` load it
 * directly, with no bundler and no path-alias resolution. `legal.ts` re-exports
 * it, so every existing caller is unaffected.
 */
export const MINIMUM_AGE = 18;

/**
 * Parse `YYYY-MM-DD` — the format an `<input type="date">` produces.
 *
 * Returns null for anything else, including dates that do not exist. `Date`
 * would silently roll 2025-02-31 forward to 3 March; a date of birth that the
 * person did not type is not a date of birth.
 */
export function parseBirthDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Real calendar arithmetic, leap days included.
 *
 * Someone born on 29 February becomes eligible on 1 March of their eighteenth
 * year in a non-leap year, which is what `Date.UTC(y + 18, 1, 29)` gives — the
 * same answer most jurisdictions reach, and never a day early.
 *
 * The eighteenth birthday itself counts: `>=`, not `>`.
 */
export function isOldEnough(birth: Date, now: Date = new Date()): boolean {
  const eligible = Date.UTC(
    birth.getUTCFullYear() + MINIMUM_AGE,
    birth.getUTCMonth(),
    birth.getUTCDate(),
  );
  return now.getTime() >= eligible;
}

/**
 * The latest date of birth that is old enough today, as `YYYY-MM-DD`.
 *
 * Used for the `max` attribute on the date input. It is a hint to the browser,
 * not the check — `isOldEnough` is the check, and the Firestore rules are the
 * backstop behind that.
 */
export function latestEligibleBirthDate(now: Date = new Date()): string {
  const d = new Date(
    Date.UTC(
      now.getUTCFullYear() - MINIMUM_AGE,
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
  return d.toISOString().slice(0, 10);
}
