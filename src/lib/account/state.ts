import type { UserProfile } from "./model";

/**
 * Where somebody is in the early-access journey.
 *
 * Derived on every read, never stored. A stored status is a second source of
 * truth that drifts the moment somebody edits the document by hand — and the
 * workspace fields *are* edited by hand, by whatever provisions them. Deriving
 * costs nothing and cannot disagree with the data it came from.
 */
export type JourneyState =
  /** Signed in with Google, but no profile yet. */
  | "needsProfile"
  /** Has an account, but has not asked for early access. */
  | "registered"
  /** Asked for early access; no workspace handed over yet. */
  | "requested"
  /** Workspace is live and the promotional week is running. */
  | "active"
  /** Workspace is live and the promotional week has run out. */
  | "trialEnded"
  /** Paying: the subscription's current period is covered. */
  | "subscribed"
  /** Was paying; the last charge failed and needs their attention. */
  | "pastDue";

/**
 * A workspace exists only when all three fields are set.
 *
 * Two of three is a half-provisioned account, and showing someone a workspace
 * they cannot reach is worse than showing them the waiting screen.
 */
export function hasWorkspace(profile: UserProfile): boolean {
  return Boolean(
    profile.workspace_username?.trim() &&
      profile.workspace_email?.trim() &&
      profile.workspace_address?.trim(),
  );
}

export function deriveState(
  profile: UserProfile | null,
  now: Date = new Date(),
): JourneyState {
  if (!profile) return "needsProfile";
  // Having an account and being in the queue are different things, and the
  // difference is the whole point of asking.
  if (!hasWorkspace(profile)) {
    return profile.earlyAccessRequestedAt ? "requested" : "registered";
  }
  // Payment outranks the trial: once a subscription exists, the trial is
  // history whether or not its week has technically run out.
  if (profile.billing?.status === "active") return "subscribed";
  if (profile.billing?.status === "pastDue") return "pastDue";
  // A workspace with no trial recorded has simply not been stamped yet; the
  // server does that on first read. Treat it as running rather than expired —
  // locking someone out over our own bookkeeping would be the worse mistake.
  if (!profile.trial) return "active";
  return new Date(profile.trial.endsAt).getTime() > now.getTime()
    ? "active"
    : "trialEnded";
}

/** Whole days left in the promotional week; 0 once it has run out. */
export function trialDaysLeft(
  profile: UserProfile,
  now: Date = new Date(),
): number {
  if (!profile.trial) return 0;
  const ms = new Date(profile.trial.endsAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}
