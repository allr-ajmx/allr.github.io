/**
 * Automatic retry for provisioning and workspace ops: transient failures (a
 * Docker pull, an OpenRouter blip) heal themselves; a real fault stops after
 * MAX_ATTEMPTS and waits for a human (the admin Retry button).
 */
export const MAX_ATTEMPTS = 3;
/** Wait before attempt n+1, indexed by attempts made so far. */
export const BACKOFF_MS = [0, 5 * 60_000, 15 * 60_000];

export type RetryDecision =
  | { attempts: number; status: "failed"; retryAt: null }
  | { attempts: number; status: "queued"; retryAt: Date };

/** After a failed attempt: requeue with backoff, or give up. */
export function nextAttempt(attempts: number, now = Date.now()): RetryDecision {
  const next = Math.max(0, attempts) + 1;
  return next >= MAX_ATTEMPTS
    ? { attempts: next, status: "failed", retryAt: null }
    : { attempts: next, status: "queued", retryAt: new Date(now + BACKOFF_MS[next]) };
}

/** A queued item whose backoff hasn't elapsed isn't claimable yet. */
export function isDue(retryAt: Date | null | undefined, now = Date.now()): boolean {
  return !retryAt || retryAt.getTime() <= now;
}

/**
 * May a payment (re)start a build, given the existing queue entry's status?
 * In flight or failed: no — one build at a time, failures go to the retry
 * policy or an admin. Finished (provisioned/released) or none: yes.
 */
export function shouldEnqueue(existingStatus: unknown): boolean {
  return !(existingStatus === "queued" || existingStatus === "claimed" || existingStatus === "failed");
}
