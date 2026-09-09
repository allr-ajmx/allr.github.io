import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { parseBirthDate } from "@/lib/age";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import {
  TRIAL_CREDIT_USD,
  TRIAL_DAYS,
  type ProfileDraft,
  type ProfilePatch,
  type PublishedUrl,
  type UserProfile,
} from "@/lib/account/model";
import { hasWorkspace } from "@/lib/account/state";
import { validateDraft } from "@/lib/account/validate";

/**
 * Everything that writes a profile.
 *
 * The browser cannot: firestore.rules refuses every client write to `users`, so
 * this module and the Admin SDK behind it are the only path. That is what makes
 * "one account per email address" a guarantee rather than a hope.
 */

const USERS = "users";
const EMAIL_CLAIMS = "user_emails";

/**
 * Email addresses are claimed by the hash of the address, not the address.
 *
 * The document id is public in the sense that anyone who can read the
 * collection can read the ids; hashing means that set is not a mailing list.
 * It is the same trick the waitlist has always used.
 */
const emailKey = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const iso = (value: unknown): string =>
  value instanceof Timestamp ? value.toDate().toISOString() : String(value ?? "");

/** Firestore's shapes out, the API's shapes in. */
function toProfile(data: FirebaseFirestore.DocumentData): UserProfile {
  const dob = data.dateOfBirth;
  return {
    uid: data.uid,
    email: data.email,
    name: data.name ?? "",
    dateOfBirth:
      dob instanceof Timestamp ? dob.toDate().toISOString().slice(0, 10) : "",
    country: data.country ?? "",
    accountType: data.accountType ?? "individual",
    entityName: data.entityName ?? "",
    marketingOptIn: Boolean(data.marketingOptIn),
    mobilePlatforms: Array.isArray(data.mobilePlatforms) ? data.mobilePlatforms : [],
    termsVersion: data.termsVersion ?? "",
    privacyVersion: data.privacyVersion ?? "",
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    workspace_username: data.workspace_username ?? null,
    workspace_email: data.workspace_email ?? null,
    workspace_address: data.workspace_address ?? null,
    trial: data.trial
      ? {
          startedAt: iso(data.trial.startedAt),
          endsAt: iso(data.trial.endsAt),
          creditUsd: Number(data.trial.creditUsd ?? TRIAL_CREDIT_USD),
          creditUsedUsd: Number(data.trial.creditUsedUsd ?? 0),
        }
      : null,
  };
}

export async function readProfile(uid: string): Promise<UserProfile | null> {
  const snap = await adminDb().collection(USERS).doc(uid).get();
  return snap.exists ? toProfile(snap.data()!) : null;
}

/**
 * Create the profile and claim the email address, or do neither.
 *
 * The claim lives in its own document keyed by the hash of the address, so a
 * second account for one person fails on a document that already exists rather
 * than on a query that might race. Both writes are in one transaction: a
 * profile without its claim would let the next signup through, and a claim
 * without its profile would lock somebody out of their own address.
 */
export async function createProfile(
  caller: Caller,
  draft: ProfileDraft,
): Promise<UserProfile> {
  const errors = validateDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw badRequest("invalid", Object.values(errors)[0] as string);
  }

  const birth = parseBirthDate(draft.dateOfBirth);
  if (!birth) throw badRequest("invalid", "That is not a date we can read.");

  const db = adminDb();
  const userRef = db.collection(USERS).doc(caller.uid);
  const claimRef = db.collection(EMAIL_CLAIMS).doc(emailKey(caller.email));

  await db.runTransaction(async (tx) => {
    const [existing, claim] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);

    if (existing.exists) {
      throw conflict("already-registered", "You already have an Allr account.");
    }
    if (claim.exists && claim.data()?.uid !== caller.uid) {
      throw conflict(
        "email-taken",
        "There is already an Allr account for that email address.",
      );
    }

    tx.set(userRef, {
      uid: caller.uid,
      // From the verified token, never from the request body.
      email: caller.email,
      name: draft.name.trim(),
      dateOfBirth: Timestamp.fromDate(birth),
      country: draft.country,
      accountType: draft.accountType,
      entityName:
        draft.accountType === "business" ? draft.entityName.trim() : "",
      marketingOptIn: Boolean(draft.marketingOptIn),
      mobilePlatforms: [...new Set(draft.mobilePlatforms)],
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      workspace_username: null,
      workspace_email: null,
      workspace_address: null,
      trial: null,
    });

    tx.set(claimRef, {
      uid: caller.uid,
      email: caller.email,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  const created = await readProfile(caller.uid);
  if (!created) throw new Error("Profile vanished immediately after creation.");
  return created;
}

/** Change the fields a person owns. Never email, workspace or trial. */
export async function updateProfile(
  caller: Caller,
  patch: ProfilePatch,
): Promise<UserProfile> {
  const current = await readProfile(caller.uid);
  if (!current) throw badRequest("no-profile", "There is no account to update.");

  const merged = {
    name: patch.name ?? current.name,
    dateOfBirth: patch.dateOfBirth ?? current.dateOfBirth,
    country: patch.country ?? current.country,
    accountType: patch.accountType ?? current.accountType,
    entityName: patch.entityName ?? current.entityName,
    marketingOptIn: patch.marketingOptIn ?? current.marketingOptIn,
    mobilePlatforms: patch.mobilePlatforms ?? current.mobilePlatforms,
  };

  const errors = validateDraft(merged);
  if (Object.keys(errors).length > 0) {
    throw badRequest("invalid", Object.values(errors)[0] as string);
  }

  const birth = parseBirthDate(merged.dateOfBirth);
  if (!birth) throw badRequest("invalid", "That is not a date we can read.");

  await adminDb()
    .collection(USERS)
    .doc(caller.uid)
    .update({
      name: merged.name.trim(),
      dateOfBirth: Timestamp.fromDate(birth),
      country: merged.country,
      accountType: merged.accountType,
      entityName:
        merged.accountType === "business" ? merged.entityName.trim() : "",
      marketingOptIn: Boolean(merged.marketingOptIn),
      mobilePlatforms: [...new Set(merged.mobilePlatforms)],
      updatedAt: FieldValue.serverTimestamp(),
    });

  return (await readProfile(caller.uid))!;
}

/**
 * Start the promotional week the first time a workspace is seen.
 *
 * Whatever provisions workspaces sets three fields and knows nothing about
 * trials, so the stamp happens here, on read. It is idempotent — a trial that
 * already exists is never restarted, which matters because this runs on every
 * page load.
 */
export async function ensureTrial(profile: UserProfile): Promise<UserProfile> {
  if (!hasWorkspace(profile) || profile.trial) return profile;

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * 86_400_000);

  await adminDb()
    .collection(USERS)
    .doc(profile.uid)
    .update({
      trial: {
        startedAt: Timestamp.fromDate(startedAt),
        endsAt: Timestamp.fromDate(endsAt),
        creditUsd: TRIAL_CREDIT_USD,
        creditUsedUsd: 0,
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

  return (await readProfile(profile.uid))!;
}

/** Everything the workspace has published for this person. */
export async function readUrls(uid: string): Promise<PublishedUrl[]> {
  const snap = await adminDb()
    .collection(USERS)
    .doc(uid)
    .collection("urls")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      url: data.url,
      title: data.title ?? null,
      kind: data.kind ?? null,
      createdAt: iso(data.createdAt),
    };
  });
}
