"use client";

import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getDb } from "./app";
import { isCountryCode } from "@/lib/countries";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
// The age gate lives on its own so it can be tested without a browser.
import { MINIMUM_AGE, isOldEnough, parseBirthDate } from "@/lib/age";

export { isOldEnough, parseBirthDate, latestEligibleBirthDate } from "@/lib/age";

/**
 * The account record: `users/{uid}`.
 *
 * Deliberately the legal minimum needed to sell to someone later, and no more.
 * Postal address, tax ID and anything payment-shaped are checkout questions
 * (DESIGN.md §16) — asking for them at signup would be collecting data we have
 * no use for yet, which is the thing a privacy policy has to justify.
 *
 * Every constraint here is mirrored in `firebase/firestore.rules`. This module
 * is the friendly copy; the rules are the enforcement, because a static site
 * has no server between the browser and the database.
 */

export type AccountType = "individual" | "business";

export type UserProfile = {
  uid: string;
  /** Always the Google-verified address; the rules check it against the token. */
  email: string;
  legalName: string;
  /** UTC midnight of the date of birth. */
  dateOfBirth: Timestamp;
  /** ISO 3166-1 alpha-2. Jurisdiction, not an address. */
  country: string;
  accountType: AccountType;
  /** "" for an individual. */
  entityName: string;
  marketingOptIn: boolean;
  termsVersion: string;
  privacyVersion: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** What the registration form hands over. */
export type ProfileDraft = {
  legalName: string;
  /** `YYYY-MM-DD`, straight off an `<input type="date">`. */
  dateOfBirth: string;
  country: string;
  accountType: AccountType;
  entityName: string;
  marketingOptIn: boolean;
};

export const MAX_LEGAL_NAME = 120;
export const MAX_ENTITY_NAME = 200;

/* ------------------------------------------------------------- validate --- */

export type DraftErrors = Partial<Record<keyof ProfileDraft, string>>;

/** Field-level messages for the registration form. Mirrors the rules. */
export function validateDraft(draft: ProfileDraft): DraftErrors {
  const errors: DraftErrors = {};

  const name = draft.legalName.trim();
  if (!name) errors.legalName = "We need your name.";
  else if (name.length < 2) errors.legalName = "That looks too short.";
  else if (name.length > MAX_LEGAL_NAME)
    errors.legalName = `Keep it under ${MAX_LEGAL_NAME} characters.`;

  const birth = parseBirthDate(draft.dateOfBirth);
  if (!draft.dateOfBirth) errors.dateOfBirth = "We need your date of birth.";
  else if (!birth) errors.dateOfBirth = "That is not a date we can read.";
  else if (birth.getTime() > Date.now())
    errors.dateOfBirth = "That date is in the future.";
  else if (!isOldEnough(birth))
    errors.dateOfBirth = `You have to be ${MINIMUM_AGE} or over to have an Allr account.`;

  if (!draft.country) errors.country = "Pick where you live.";
  else if (!isCountryCode(draft.country))
    errors.country = "We do not recognise that country.";

  if (draft.accountType === "business") {
    const entity = draft.entityName.trim();
    if (!entity) errors.entityName = "We need the registered name of the business.";
    else if (entity.length > MAX_ENTITY_NAME)
      errors.entityName = `Keep it under ${MAX_ENTITY_NAME} characters.`;
  }

  return errors;
}

/* ------------------------------------------------------------------ i/o --- */

/** The profile, or `null` when this account has not registered yet. */
export async function readProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/**
 * Write the profile for the first time.
 *
 * `setDoc` rather than `addDoc`: the document id *is* the uid, which is what
 * lets the rules say "you may only touch your own" without a query.
 */
export async function createProfile(
  user: User,
  draft: ProfileDraft,
): Promise<void> {
  const birth = parseBirthDate(draft.dateOfBirth);
  if (!birth || !isOldEnough(birth)) {
    throw new Error("Refusing to create a profile that fails the age check.");
  }
  if (!user.email) throw new Error("Google returned no email address.");

  await setDoc(doc(getDb(), "users", user.uid), {
    uid: user.uid,
    email: user.email.toLowerCase(),
    legalName: draft.legalName.trim(),
    dateOfBirth: Timestamp.fromDate(birth),
    country: draft.country,
    accountType: draft.accountType,
    // Always present, "" for an individual — so the shape never varies and the
    // rules can check it without branching.
    entityName: draft.accountType === "business" ? draft.entityName.trim() : "",
    marketingOptIn: draft.marketingOptIn,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Change part of an existing profile.
 *
 * `updateDoc`, so the fields left out keep their stored values — which is also
 * how `uid`, `email` and `createdAt` satisfy the rules' immutability checks
 * without the caller having to echo them back.
 */
export async function saveProfile(
  uid: string,
  changes: Partial<ProfileDraft>,
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (changes.legalName !== undefined) patch.legalName = changes.legalName.trim();
  if (changes.country !== undefined) patch.country = changes.country;
  if (changes.marketingOptIn !== undefined)
    patch.marketingOptIn = changes.marketingOptIn;
  if (changes.accountType !== undefined) {
    patch.accountType = changes.accountType;
    // Leaving a stale entity name on an account that just became an individual
    // would keep data we no longer have a reason to hold.
    if (changes.accountType === "individual") patch.entityName = "";
  }
  if (changes.entityName !== undefined && patch.entityName === undefined) {
    patch.entityName = changes.entityName.trim();
  }
  if (changes.dateOfBirth !== undefined) {
    const birth = parseBirthDate(changes.dateOfBirth);
    if (!birth || !isOldEnough(birth)) {
      throw new Error("Refusing to save a date of birth that fails the age check.");
    }
    patch.dateOfBirth = Timestamp.fromDate(birth);
  }

  await updateDoc(doc(getDb(), "users", uid), patch);
}

/** `YYYY-MM-DD` for an `<input type="date">`, from a stored Timestamp. */
export function birthDateInputValue(ts: Timestamp): string {
  return ts.toDate().toISOString().slice(0, 10);
}
