/**
 * Razorpay refusals, classified — pure. "This id doesn't exist here" (e.g. a
 * test-mode subscription now that the keys are live) is permanent and safe to
 * treat as ended; anything else may be an outage and must be retried.
 */
export function isMissingRefusal(upstreamStatus: number, description: string): boolean {
  return (
    (upstreamStatus === 400 || upstreamStatus === 404) &&
    /does not exist|not found|no such|invalid.*id/i.test(description)
  );
}
