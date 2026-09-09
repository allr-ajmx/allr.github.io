/**
 * The versions of the documents a person agrees to when they register.
 *
 * Consent is only worth keeping if you can say *what* was consented to. The
 * stored profile records these strings, and `/terms` and `/privacy` render the
 * same ones, so a consent record can never claim a version the page does not
 * show. Bump the version whenever the wording changes materially — a new
 * version is what tells us who still needs to re-accept.
 *
 * `0.1-draft` is honest: the pages are scaffolds until the real wording lands.
 */

export const TERMS_VERSION = "0.1-draft";
export const PRIVACY_VERSION = "0.1-draft";

/** Shown on the page itself, so a reader can see how current it is. */
export const TERMS_UPDATED = "2026-09-08";
export const PRIVACY_UPDATED = "2026-09-08";

/**
 * The age of contract. Allr does not sell to anyone below it (DESIGN.md §16).
 * Defined in `age.ts` beside the check that uses it, and re-exported here so
 * that `@/lib/legal` stays the one place to look for a legal constant.
 */
export { MINIMUM_AGE } from "./age";

/**
 * Where a privacy or account request goes.
 *
 * TODO: confirm this address exists before the legal pages go live — a policy
 * that names a mailbox nobody reads is worse than one that names none. It is a
 * constant so there is exactly one place to correct.
 */
export const CONTACT_EMAIL = "hello@allr.work";
