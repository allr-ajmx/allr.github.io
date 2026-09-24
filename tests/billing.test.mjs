/**
 * The two ways billing can be wrong that no dashboard would show us quickly:
 * accepting a webhook we should refuse, and deriving the wrong journey state
 * from a billing block. Run with `pnpm test:billing` — Node imports the
 * TypeScript directly, same as the age tests.
 */

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../src/lib/billing/signature.ts";
import {
  GRACE_DAYS,
  normalizeProviderStatus,
  planCurrencyFor,
} from "../src/lib/billing/model.ts";
import { deriveState } from "../src/lib/account/state.ts";

const SECRET = "whsec_test";
const sign = (body, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "subscription.activated" });

  it("accepts the signature Razorpay would send", () => {
    assert.equal(verifyWebhookSignature(body, sign(body), SECRET), true);
  });
  it("refuses a body that changed after signing", () => {
    assert.equal(verifyWebhookSignature(body + " ", sign(body), SECRET), false);
  });
  it("refuses a signature under the wrong secret", () => {
    assert.equal(verifyWebhookSignature(body, sign(body, "other"), SECRET), false);
  });
  it("refuses empty signature or secret outright", () => {
    assert.equal(verifyWebhookSignature(body, "", SECRET), false);
    assert.equal(verifyWebhookSignature(body, sign(body), ""), false);
  });
  it("refuses a signature of a different length without throwing", () => {
    assert.equal(verifyWebhookSignature(body, "abc", SECRET), false);
  });
});

describe("verifyCheckoutSignature", () => {
  it("accepts payment_id|subscription_id under the key secret", () => {
    const sig = createHmac("sha256", "keysecret").update("pay_1|sub_1").digest("hex");
    assert.equal(verifyCheckoutSignature("pay_1", "sub_1", sig, "keysecret"), true);
  });
  it("refuses when the ids are swapped", () => {
    const sig = createHmac("sha256", "keysecret").update("pay_1|sub_1").digest("hex");
    assert.equal(verifyCheckoutSignature("sub_1", "pay_1", sig, "keysecret"), false);
  });
});

describe("normalizeProviderStatus", () => {
  it("maps the full Razorpay lifecycle onto ours", () => {
    assert.equal(normalizeProviderStatus("created"), "pending");
    assert.equal(normalizeProviderStatus("authenticated"), "pending");
    assert.equal(normalizeProviderStatus("active"), "active");
    assert.equal(normalizeProviderStatus("resumed"), "active");
    assert.equal(normalizeProviderStatus("pending"), "pastDue");
    assert.equal(normalizeProviderStatus("halted"), "pastDue");
    assert.equal(normalizeProviderStatus("cancelled"), "ended");
    assert.equal(normalizeProviderStatus("completed"), "ended");
    assert.equal(normalizeProviderStatus("expired"), "ended");
  });
  it("treats a status Razorpay invents tomorrow as pending, never paid", () => {
    assert.equal(normalizeProviderStatus("something_new"), "pending");
  });
});

describe("planCurrencyFor", () => {
  it("bills India in INR and everyone else in USD", () => {
    assert.equal(planCurrencyFor("IN"), "INR");
    assert.equal(planCurrencyFor("in"), "INR");
    assert.equal(planCurrencyFor("US"), "USD");
    assert.equal(planCurrencyFor(""), "USD");
  });
});

describe("deriveState with billing", () => {
  const base = {
    uid: "u1",
    email: "a@b.c",
    name: "A",
    confirmedOver18: true,
    country: "US",
    accountType: "individual",
    entityName: "",
    marketingOptIn: false,
    mobilePlatforms: [],
    earlyAccessRequestedAt: "2026-01-01T00:00:00.000Z",
    termsVersion: "1",
    privacyVersion: "1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    workspace_username: "a",
    workspace_email: "a@ws",
    workspace_address: "https://a.allr.work",
    trial: {
      startedAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2026-01-08T00:00:00.000Z",
      creditUsd: 5,
      creditUsedUsd: 0,
    },
    billing: null,
  };
  const billing = (status) => ({
    status,
    planCurrency: "USD",
    subscriptionId: "sub_1",
    customerId: "cust_1",
    currentPeriodEnd: null,
    providerStatus: status,
    updatedAt: "2026-01-02T00:00:00.000Z",
  });
  const inTrial = new Date("2026-01-03T00:00:00.000Z");
  const afterTrial = new Date("2026-02-01T00:00:00.000Z");

  it("an active subscription is subscribed, trial or no trial", () => {
    assert.equal(deriveState({ ...base, billing: billing("active") }, inTrial), "subscribed");
    assert.equal(deriveState({ ...base, billing: billing("active") }, afterTrial), "subscribed");
  });
  it("a failing subscription is pastDue even during the trial window", () => {
    assert.equal(deriveState({ ...base, billing: billing("pastDue") }, inTrial), "pastDue");
  });
  it("a merely created subscription changes nothing until money moves", () => {
    assert.equal(deriveState({ ...base, billing: billing("pending") }, inTrial), "active");
    assert.equal(deriveState({ ...base, billing: billing("pending") }, afterTrial), "trialEnded");
  });
  it("an ended subscription falls back to the trial's verdict", () => {
    assert.equal(deriveState({ ...base, billing: billing("ended") }, afterTrial), "trialEnded");
  });
  it("no billing behaves exactly as before billing existed", () => {
    assert.equal(deriveState(base, inTrial), "active");
    assert.equal(deriveState(base, afterTrial), "trialEnded");
  });
  it("grace is a policy number the suspender reads, not a hidden state", () => {
    assert.equal(typeof GRACE_DAYS, "number");
  });
});
