/**
 * The versions of the documents a person agrees to when they register.
 *
 * Consent is only worth keeping if you can say *what* was consented to. The
 * stored profile records these strings, and `/terms` and `/privacy` render the
 * same ones, so a consent record can never claim a version the page does not
 * show. Bump the version whenever the wording changes materially — a new
 * version is what tells us who still needs to re-accept.
 */

export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

/** Shown on the page itself, so a reader can see how current it is. */
export const TERMS_UPDATED = "2026-09-15";
export const PRIVACY_UPDATED = "2026-09-15";

/**
 * The age of contract. Allr does not sell to anyone below it (DESIGN.md §16).
 * Defined in `age.ts` beside the check that uses it, and re-exported here so
 * that `@/lib/legal` stays the one place to look for a legal constant.
 */
export { MINIMUM_AGE } from "./age";

/** The natural person who operates Allr until a later company takes it over. */
export const LEGAL_OPERATOR = "Jai Shukla";

/** Trading name under which the service is offered. */
export const LEGAL_TRADING_AS = "Allr";

/**
 * Indian company that services billing / payment collection for Allr.
 * It is not the product provider or the privacy “who we are” party.
 */
export const BILLING_ENTITY = "Vasinya Yunaan Private Limited";

/**
 * Where a privacy, terms, or account request goes.
 *
 * One mailbox for notices so the pages and the registration consent never
 * disagree about who to write to.
 */
export const CONTACT_EMAIL = "ceo@allr.work";
