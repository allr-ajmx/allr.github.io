/**
 * The admin panel's security boundary: every lever's input validation, run
 * exactly as the server runs it. A refusal here is a 400 for any client,
 * crafted or not.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ActionRefused, parseAction } from "../src/lib/admin/parse-action.ts";

const NOW = new Date("2026-10-02T12:00:00Z");
const refused = (body, code) =>
  assert.throws(() => parseAction(body, NOW), (e) => e instanceof ActionRefused && (!code || e.code === code));

describe("profile edits", () => {
  it("accepts a name and/or a country, normalising the code", () => {
    assert.deepEqual(parseAction({ action: "edit_profile", uid: "u", name: " Kamal Gurnani ", country: "in" }, NOW),
      { action: "edit_profile", uid: "u", name: "Kamal Gurnani", country: "IN" });
  });
  it("refuses empty edits, silly names, unknown countries, missing uid", () => {
    refused({ action: "edit_profile", uid: "u" });
    refused({ action: "edit_profile", uid: "u", name: "K" });
    refused({ action: "edit_profile", uid: "u", country: "ZZ" });
    refused({ action: "edit_profile", name: "Kamal" });
  });
});

describe("email transfer", () => {
  it("lower-cases and accepts a valid address", () => {
    assert.equal(parseAction({ action: "transfer_email", uid: "u", email: "New@Gmail.com" }, NOW).email, "new@gmail.com");
  });
  it("refuses anything that isn't an address", () => {
    refused({ action: "transfer_email", uid: "u", email: "not-an-email" });
    refused({ action: "transfer_email", uid: "u" });
  });
  it("roster workspaces can be re-pointed too", () => {
    assert.equal(parseAction({ action: "ws_set_email", username: "shubham", email: "x@y.co" }, NOW).email, "x@y.co");
    refused({ action: "ws_set_email", username: "Bad Name!", email: "x@y.co" }, "bad-username");
  });
});

describe("credit grants", () => {
  it("accepts an amount, an optional future expiry and a note", () => {
    const a = parseAction({ action: "grant_credit", uid: "u", usd: "15", expiresAt: "2026-12-31", note: "launch promo" }, NOW);
    assert.equal(a.usd, 15);
    assert.equal(a.expiresAt, "2026-12-31T00:00:00.000Z");
    assert.equal(a.note, "launch promo");
    assert.equal(parseAction({ action: "grant_credit", uid: "u", usd: 5 }, NOW).expiresAt, null);
  });
  it("refuses zero, negative, huge, and past-dated grants", () => {
    refused({ action: "grant_credit", uid: "u", usd: 0 });
    refused({ action: "grant_credit", uid: "u", usd: -5 });
    refused({ action: "grant_credit", uid: "u", usd: 501 });
    refused({ action: "grant_credit", uid: "u", usd: 5, expiresAt: "2026-09-01" });
    refused({ action: "grant_credit", uid: "u", usd: 5, expiresAt: "someday" });
  });
  it("revoke needs a grant id; included is $0–$500", () => {
    refused({ action: "revoke_grant", uid: "u" });
    assert.equal(parseAction({ action: "set_included", uid: "u", usd: 0 }, NOW).usd, 0);
    refused({ action: "set_included", uid: "u", usd: 900 });
  });
});

describe("destructive levers", () => {
  it("removal must name the workspace; roster removal must match exactly", () => {
    refused({ action: "remove", uid: "u" }, "confirm");
    assert.equal(parseAction({ action: "remove", uid: "u", confirm: "Kamal" }, NOW).confirm, "kamal");
    refused({ action: "ws_remove", username: "kamal", confirm: "other" }, "confirm");
  });
  it("unknown actions are refused, not ignored", () => {
    refused({ action: "drop_database", uid: "u" });
    refused({ action: "ws_explode", username: "kamal" });
    refused(null);
  });
});

describe("removal billing choice", () => {
  it("refund is opt-in: only an explicit true refunds", () => {
    assert.equal(parseAction({ action: "remove", uid: "u", confirm: "k" }, NOW).refund, false);
    assert.equal(parseAction({ action: "remove", uid: "u", confirm: "k", refund: "yes" }, NOW).refund, false);
    assert.equal(parseAction({ action: "remove", uid: "u", confirm: "k", refund: true }, NOW).refund, true);
  });
});

describe("retry", () => {
  it("accepts the ids we mint for provisions and ops", () => {
    assert.deepEqual(parseAction({ action: "retry", kind: "provision", id: "AbC123xyz" }, NOW),
      { action: "retry", kind: "provision", id: "AbC123xyz" });
    assert.equal(parseAction({ action: "retry", kind: "op", id: "ws:kamal:sync_limit" }, NOW).id, "ws:kamal:sync_limit");
  });
  it("refuses unknown kinds and ids that could address another path", () => {
    refused({ action: "retry", kind: "billing", id: "u1" });
    refused({ action: "retry", kind: "op", id: "" });
    refused({ action: "retry", kind: "op", id: "users/u1" });
    refused({ action: "retry", kind: "op", id: "../x" });
  });
});

describe("delete account", () => {
  it("requires the account's email as confirmation, case-insensitively", () => {
    refused({ action: "delete_account", uid: "u" }, "confirm");
    assert.deepEqual(parseAction({ action: "delete_account", uid: "u", confirm: " A@B.co " }, NOW),
      { action: "delete_account", uid: "u", confirm: "a@b.co" });
  });
  it("needs a uid", () => {
    refused({ action: "delete_account", confirm: "a@b.co" });
  });
});

describe("promo codes", () => {
  it("creates with defaults: 30 days, $5, normalized code, no expiry", () => {
    assert.deepEqual(parseAction({ action: "promo_create", code: " launch-26 ", maxUses: 50 }, NOW), {
      action: "promo_create", code: "LAUNCH-26", maxUses: 50, expiresAt: null, days: 30, creditUsd: 5, note: "",
    });
  });
  it("accepts a future expiry and custom days/credit within bounds", () => {
    const a = parseAction({ action: "promo_create", code: "VIP", maxUses: 1, expiresAt: "2026-12-31", days: 60, creditUsd: 12.5 }, NOW);
    assert.deepEqual([a.days, a.creditUsd, a.expiresAt], [60, 12.5, "2026-12-31T00:00:00.000Z"]);
  });
  it("refuses bad codes, caps, days, credit and past expiry", () => {
    refused({ action: "promo_create", code: "x", maxUses: 5 });
    refused({ action: "promo_create", code: "OK1", maxUses: 0 });
    refused({ action: "promo_create", code: "OK1", maxUses: 1.5 });
    refused({ action: "promo_create", code: "OK1", maxUses: 5, days: 365 });
    refused({ action: "promo_create", code: "OK1", maxUses: 5, creditUsd: 500 });
    refused({ action: "promo_create", code: "OK1", maxUses: 5, expiresAt: "2026-10-01" });
  });
  it("switching on/off needs an explicit boolean", () => {
    assert.deepEqual(parseAction({ action: "promo_set_active", code: "vip", active: false }, NOW),
      { action: "promo_set_active", code: "VIP", active: false });
    refused({ action: "promo_set_active", code: "VIP", active: "no" });
  });
});

describe("payment levers", () => {
  it("resolve_flag takes an event id and an optional note", () => {
    assert.deepEqual(parseAction({ action: "resolve_flag", id: "refund:rfnd_123", note: " checked " }, NOW),
      { action: "resolve_flag", id: "refund:rfnd_123", note: "checked" });
    refused({ action: "resolve_flag", id: "../users/x" });
    refused({ action: "resolve_flag", id: "" });
  });
  it("refund_topup only takes a Razorpay payment id", () => {
    assert.deepEqual(parseAction({ action: "refund_topup", paymentId: "pay_Tj8wuitRbP0Unp" }, NOW),
      { action: "refund_topup", paymentId: "pay_Tj8wuitRbP0Unp" });
    refused({ action: "refund_topup", paymentId: "order_123" });
    refused({ action: "refund_topup", paymentId: "pay_x/../y" });
  });
});
