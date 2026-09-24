import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay's two signatures, verified the same way: HMAC-SHA256 under a
 * secret we hold, compared in constant time. Nothing here reads env — the
 * caller supplies the secret, which is what makes this testable.
 */

const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

/** Webhook: the signature header is the HMAC of the raw body. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

/**
 * Checkout handler: for subscriptions the signed payload is
 * `payment_id + "|" + subscription_id`, under the key *secret*.
 */
export function verifyCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
  keySecret: string,
): boolean {
  if (!paymentId || !subscriptionId || !signature || !keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}
