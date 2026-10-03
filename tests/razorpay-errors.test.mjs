/**
 * Regression: removing a test-mode account after going live failed with "our
 * payment provider had a problem" — Razorpay's "id does not exist" was read as
 * an outage. It must be told apart: permanent, safe to treat as ended.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMissingRefusal } from "../src/lib/billing/razorpay-errors.ts";

describe("isMissingRefusal", () => {
  it("Razorpay's 'id does not exist' is missing", () => {
    assert.equal(isMissingRefusal(400, "The id provided does not exist"), true);
    assert.equal(isMissingRefusal(404, "Not found"), true);
    // Seen in production for a test-mode subscription after going live:
    assert.equal(isMissingRefusal(400, "The ID provided is invalid or could not be found."), true);
    assert.equal(isMissingRefusal(400, "invalid id"), true);
  });
  it("outages and other refusals are not", () => {
    assert.equal(isMissingRefusal(500, "Internal error"), false);
    assert.equal(isMissingRefusal(401, "Authentication failed"), false);
    assert.equal(isMissingRefusal(400, "Refund amount exceeds the captured amount"), false);
    assert.equal(isMissingRefusal(400, "The amount is invalid"), false);
    assert.equal(isMissingRefusal(400, "payment_id is required"), false);
  });
});
