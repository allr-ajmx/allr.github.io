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
  /** `YYYY-MM-DD`. */
  dateOfBirth: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  accountType: AccountType;
  /** "" for an individual. */
  entityName: string;
  marketingOptIn: boolean;
  mobilePlatforms: MobilePlatform[];
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

/** What the registration form sends. */
export type ProfileDraft = {
  name: string;
  dateOfBirth: string;
  country: string;
  accountType: AccountType;
  entityName: string;
  marketingOptIn: boolean;
  mobilePlatforms: MobilePlatform[];
};

/** The subset a person may change afterwards. Never email, never workspace. */
export type ProfilePatch = Partial<Omit<ProfileDraft, "dateOfBirth">> & {
  dateOfBirth?: string;
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
