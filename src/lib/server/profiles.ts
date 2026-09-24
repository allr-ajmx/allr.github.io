import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./admin";
import { badRequest, conflict } from "./errors";
import type { Caller } from "./session";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import {
  TRIAL_CREDIT_USD,
  TRIAL_DAYS,
  type EarlyAccessRequest,
  type ProfileDraft,
  type ProfilePatch,
  type PublishedUrl,
  type UserProfile,
} from "@/lib/account/model";
import { hasWorkspace } from "@/lib/account/state";
import { validateDraft, validateEarlyAccess } from "@/lib/account/validate";

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

/**
 * Age gate on read: new profiles store `confirmedOver18`; older ones stored a
 * date of birth that already passed the same check. Either is enough.
 */
function readConfirmedOver18(data: FirebaseFirestore.DocumentData): boolean {
  if (data.confirmedOver18 === true) return true;
  const dob = data.dateOfBirth;
  return dob instanceof Timestamp || typeof dob === "string";
}

/** Firestore's shapes out, the API's shapes in. */
function toProfile(data: FirebaseFirestore.DocumentData): UserProfile {
  return {
    uid: data.uid,
    email: data.email,
    name: data.name ?? "",
    confirmedOver18: readConfirmedOver18(data),
    country: data.country ?? "",
    accountType: data.accountType ?? "individual",
    entityName: data.entityName ?? "",
    marketingOptIn: Boolean(data.marketingOptIn),
    mobilePlatforms: Array.isArray(data.mobilePlatforms) ? data.mobilePlatforms : [],
    earlyAccessRequestedAt: data.earlyAccessRequestedAt
      ? iso(data.earlyAccessRequestedAt)
      : null,
    termsVersion: data.termsVersion ?? "",
    privacyVersion: data.privacyVersion ?? "",
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
    workspace_username: data.workspace_username ?? null,
    workspace_email: data.workspace_email ?? null,
    workspace_address: data.workspace_address ?? null,
    pendingWorkspaceUsername: data.pending_workspace_username ?? null,
    billing: data.billing
      ? {
          status: data.billing.status,
          planCurrency: data.billing.planCurrency,
          subscriptionId: data.billing.subscriptionId,
          customerId: data.billing.customerId ?? "",
          currentPeriodEnd: data.billing.currentPeriodEnd ?? null,
          providerStatus: data.billing.providerStatus ?? "",
          updatedAt: iso(data.billing.updatedAt),
        }
      : null,
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
 * Whether the uid on a claim still belongs to anybody.
 *
 * A Firebase account can be deleted and the person can sign in again with the
 * same Google address, getting a *new* uid. When that happens the old claim
 * outlives the identity it named.
 */
async function identityExists(uid: string): Promise<boolean> {
  try {
    await adminAuth().getUser(uid);
    return true;
  } catch {
    return false;
  }
}

/**
 * The caller's profile, adopting one stranded under a dead uid.
 *
 * Keying profiles by uid and claiming addresses separately left a trap: delete
 * the Firebase account and sign in again, and you arrive with a new uid that
 * has no profile — so you are shown the signup form — while the claim still
 * points at the old uid, so signing up is refused as a duplicate. Locked out of
 * an account that plainly exists, with no way forward.
 *
 * The address is the person, not the uid. So when a claim names a uid that Auth
 * no longer knows, the profile is moved to whoever proves control of that
 * verified address — which, because `requireUser` has already checked the token
 * came from Google and the address is verified, is them.
 *
 * A claim whose uid *does* still exist is never touched: that is somebody
 * else's account and refusing is correct.
 */
export async function readOrAdoptProfile(caller: Caller): Promise<UserProfile | null> {
  const own = await readProfile(caller.uid);
  if (own) return own;

  const db = adminDb();
  const claimRef = db.collection(EMAIL_CLAIMS).doc(emailKey(caller.email));
  const claim = await claimRef.get();
  if (!claim.exists) return null;

  const strandedUid = claim.data()?.uid as string | undefined;
  if (!strandedUid || strandedUid === caller.uid) return null;
  if (await identityExists(strandedUid)) return null;

  const strandedRef = db.collection(USERS).doc(strandedUid);
  const stranded = await strandedRef.get();
  if (!stranded.exists) {
    // A claim with no profile behind it is just litter; let registration reuse
    // the address rather than refusing forever.
    await claimRef.delete();
    return null;
  }

  const userRef = db.collection(USERS).doc(caller.uid);
  await db.runTransaction(async (tx) => {
    tx.set(userRef, {
      ...stranded.data(),
      uid: caller.uid,
      email: caller.email,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.delete(strandedRef);
    tx.set(claimRef, { uid: caller.uid, email: caller.email, adoptedAt: FieldValue.serverTimestamp() }, { merge: true });
  });

  console.warn(
    `[account] adopted ${caller.email}: ${strandedUid} no longer exists in Auth, moved to ${caller.uid}`,
  );

  return readProfile(caller.uid);
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

  // Somebody whose old identity was deleted has an account already; give it
  // back rather than turning them away from an address that is theirs.
  const adopted = await readOrAdoptProfile(caller);
  if (adopted) {
    throw conflict("already-registered", "You already have an Allr account.");
  }

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
      confirmedOver18: true,
      country: draft.country,
      accountType: "individual",
      entityName: "",
      marketingOptIn: Boolean(draft.marketingOptIn),
      mobilePlatforms: [],
      earlyAccessRequestedAt: null,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      workspace_username: null,
      workspace_email: null,
      workspace_address: null,
      trial: null,
      billing: null,
      pending_workspace_username: null,
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
    // Age attestation is set at registration and is not editable afterwards.
    confirmedOver18: current.confirmedOver18,
    country: patch.country ?? current.country,
    accountType: "individual" as const,
    entityName: "",
    marketingOptIn: patch.marketingOptIn ?? current.marketingOptIn,
  };
  const mobilePlatforms = patch.mobilePlatforms ?? current.mobilePlatforms;

  const errors = validateDraft(merged);
  if (Object.keys(errors).length > 0) {
    throw badRequest("invalid", Object.values(errors)[0] as string);
  }

  await adminDb()
    .collection(USERS)
    .doc(caller.uid)
    .update({
      name: merged.name.trim(),
      country: merged.country,
      accountType: "individual",
      entityName: "",
      marketingOptIn: Boolean(merged.marketingOptIn),
      mobilePlatforms: [...new Set(mobilePlatforms)],
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

/**
 * Ask for early access.
 *
 * Separate from registration because they are separate acts: an account is for
 * anyone, the queue is a choice. It is idempotent — asking twice keeps the
 * original timestamp, so a double-click does not quietly move somebody to the
 * back of a queue ordered by when they asked.
 */
export async function requestEarlyAccess(
  caller: Caller,
  request: EarlyAccessRequest,
): Promise<UserProfile> {
  const profile = await readOrAdoptProfile(caller);
  if (!profile) {
    throw badRequest("no-profile", "Make an account before asking for access.");
  }

  const errors = validateEarlyAccess(request);
  if (errors.mobilePlatforms) {
    throw badRequest("invalid", errors.mobilePlatforms);
  }

  await adminDb()
    .collection(USERS)
    .doc(caller.uid)
    .update({
      mobilePlatforms: [...new Set(request.mobilePlatforms)],
      earlyAccessRequestedAt:
        profile.earlyAccessRequestedAt
          ? Timestamp.fromDate(new Date(profile.earlyAccessRequestedAt))
          : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return (await readProfile(caller.uid))!;
}
