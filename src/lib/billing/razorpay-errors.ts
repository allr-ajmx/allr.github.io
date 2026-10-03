/**
 * Razorpay refusals, classified — pure. "This id doesn't exist here" (e.g. a
 * test-mode subscription now that the keys are live) is permanent and safe to
 * treat as ended; anything else may be an outage and must be retried.
 */
export function isMissingRefusal(upstreamStatus: number, description: string): boolean {
  return (
    (upstreamStatus === 400 || upstreamStatus === 404) &&
    // Razorpay words this several ways: "The id provided does not exist",
    // "The ID provided is invalid or could not be found", "Not found".
    /does not exist|not (?:be )?found|no such|\bid\b[^.]*\binvalid\b|\binvalid\b[^.]*\bid\b/i.test(description)
  );
}
