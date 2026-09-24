import { isCountryCode } from "@/lib/countries";
import { MINIMUM_AGE } from "@/lib/age";
import {
  MAX_NAME,
  type EarlyAccessRequest,
  type MobilePlatform,
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

  if (!draft.confirmedOver18) {
    errors.confirmedOver18 = `You have to be ${MINIMUM_AGE} or over to have an Allr account.`;
  }

  if (!draft.country) errors.country = "Pick where you live.";
  else if (!isCountryCode(draft.country))
    errors.country = "We do not recognise that country.";

  // Accounts are individual only — business signup is not offered.
  if (draft.accountType !== "individual") {
    errors.accountType = "Allr accounts are for individuals.";
  }

  return errors;
}

/** True when nothing is wrong. */
export function isValidDraft(draft: ProfileDraft): boolean {
  return Object.keys(validateDraft(draft)).length === 0;
}

/**
 * Asking for early access.
 *
 * Early access enrols people in mobile testing, so the track has to be known —
 * but both is a real answer, not a fallback for indecision.
 */
export function validateEarlyAccess(
  request: EarlyAccessRequest,
): { mobilePlatforms?: string } {
  const platforms = request.mobilePlatforms ?? [];
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return { mobilePlatforms: "Pick at least one — you can change it later." };
  }
  if (platforms.some((p: MobilePlatform) => !PLATFORMS.has(p))) {
    return { mobilePlatforms: "That is not a platform we test on." };
  }
  return {};
}
