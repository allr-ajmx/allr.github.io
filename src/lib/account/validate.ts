import { isCountryCode } from "@/lib/countries";
import { isOldEnough, MINIMUM_AGE, parseBirthDate } from "@/lib/age";
import {
  MAX_ENTITY_NAME,
  MAX_NAME,
  type ProfileDraft,
} from "./model";

/**
 * The one validator, run twice.
 *
 * The browser runs it to say what is wrong while somebody types; the server
 * runs the same function before writing anything. Two implementations of the
 * same rules is how a form ends up promising something the database refuses —
 * or worse, accepting something it should not, because only the half that could
 * be bypassed was checking.
 */

export type DraftErrors = Partial<Record<keyof ProfileDraft, string>>;

const PLATFORMS = new Set(["ios", "android"]);

export function validateDraft(draft: ProfileDraft): DraftErrors {
  const errors: DraftErrors = {};

  const name = draft.name?.trim() ?? "";
  if (!name) errors.name = "We need your name.";
  else if (name.length < 2) errors.name = "That looks too short.";
  else if (name.length > MAX_NAME)
    errors.name = `Keep it under ${MAX_NAME} characters.`;

  const birth = draft.dateOfBirth ? parseBirthDate(draft.dateOfBirth) : null;
  if (!draft.dateOfBirth) errors.dateOfBirth = "We need your date of birth.";
  else if (!birth) errors.dateOfBirth = "That is not a date we can read.";
  else if (birth.getTime() > Date.now())
    errors.dateOfBirth = "That date is in the future.";
  else if (!isOldEnough(birth))
    errors.dateOfBirth = `You have to be ${MINIMUM_AGE} or over to have an Allr account.`;

  if (!draft.country) errors.country = "Pick where you live.";
  else if (!isCountryCode(draft.country))
    errors.country = "We do not recognise that country.";

  if (draft.accountType !== "individual" && draft.accountType !== "business") {
    errors.accountType = "Pick who this account is for.";
  }

  if (draft.accountType === "business") {
    const entity = draft.entityName?.trim() ?? "";
    if (!entity) errors.entityName = "We need the registered name of the business.";
    else if (entity.length > MAX_ENTITY_NAME)
      errors.entityName = `Keep it under ${MAX_ENTITY_NAME} characters.`;
  }

  // Early access enrols people in mobile testing, so we have to know which
  // track — but both is a real answer, not a fallback.
  const platforms = draft.mobilePlatforms ?? [];
  if (!Array.isArray(platforms) || platforms.length === 0) {
    errors.mobilePlatforms = "Pick at least one — you can change it later.";
  } else if (platforms.some((p) => !PLATFORMS.has(p))) {
    errors.mobilePlatforms = "That is not a platform we test on.";
  }

  return errors;
}

/** True when nothing is wrong. */
export function isValidDraft(draft: ProfileDraft): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}
