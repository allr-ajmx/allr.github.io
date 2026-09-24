/**
 * The account record, and the shapes that cross the API.
 *
 * This module imports nothing that only runs in one place, because both halves
 * need it: the browser renders from these types and the server validates
 * against them. Dates cross the wire as strings — a Firestore `Timestamp` does
 * not survive JSON, and a client that never sees one is a client that cannot
 * mishandle one.
 */

export type AccountType = "individual" | "business";

/**
 * Stored on the profile for backwards compatibility. New registrations are
 * always `"individual"` — business signup is not offered.
 */

/** iOS and Android are independent tester tracks; somebody may want both. */
export type MobilePlatform = "ios" | "android";

export const MOBILE_PLATFORMS: readonly { id: MobilePlatform; label: string }[] = [
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
];

/** The promotional week that starts when a workspace is handed over. */
export type Trial = {
  /** ISO 8601. */
  startedAt: string;
  endsAt: string;
  creditUsd: number;
  creditUsedUsd: number;
};

export const TRIAL_DAYS = 7;
export const TRIAL_CREDIT_USD = 5;

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  /**
   * Self-declared at registration: the person ticked that they are 18+.
   * True for every completed profile — including older ones that stored a
   * date of birth instead, which already passed the age gate.
   */
  confirmedOver18: boolean;
  /** ISO 3166-1 alpha-2. */
  country: string;
  accountType: AccountType;
  /** "" for an individual. */
  entityName: string;
  marketingOptIn: boolean;
  /** Which tester tracks they joined. Chosen when asking for early access. */
  mobilePlatforms: MobilePlatform[];
  /**
   * When they asked for early access, or null if they have not.
   *
   * Signing up and asking are two acts: an account is for everyone, early
   * access is a queue. Merging them meant anyone who made an account was in the
   * queue whether they meant to be or not.
   */
  earlyAccessRequestedAt: string | null;
  termsVersion: string;
  privacyVersion: string;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;

  /**
   * Written by the server and by whoever provisions workspaces — never by the
   * person they describe. All three being set *is* the approval (DESIGN.md
   * §16), so there is no second flag to disagree with them.
   */
  workspace_username: string | null;
  workspace_email: string | null;
  workspace_address: string | null;

  trial: Trial | null;
};

/**
 * What the registration form sends.
 *
 * Everything here is about *who you are*. Which phone you want to test on is
 * not — it only means anything once you are asking for early access, so it is
 * asked there instead.
 */
export type ProfileDraft = {
  name: string;
  confirmedOver18: boolean;
  country: string;
  accountType: AccountType;
  entityName: string;
  marketingOptIn: boolean;
};

/** What asking for early access sends. */
export type EarlyAccessRequest = {
  mobilePlatforms: MobilePlatform[];
};

/** The subset a person may change afterwards. Never email, never workspace. */
export type ProfilePatch = Partial<ProfileDraft> & {
  mobilePlatforms?: MobilePlatform[];
};

export const MAX_NAME = 120;
export const MAX_ENTITY_NAME = 200;

/** A URL the workspace has published for this person. */
export type PublishedUrl = {
  id: string;
  url: string;
  title: string | null;
  kind: string | null;
  /** ISO 8601. */
  createdAt: string;
};
