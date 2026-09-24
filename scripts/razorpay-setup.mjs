/**
 * One-time: create the two monthly plans and print their ids.
 *
 *   RAZORPAY_KEY_ID=rzp_test_… RAZORPAY_KEY_SECRET=… node scripts/razorpay-setup.mjs
 *
 * Run once against test keys and once against live keys; put the printed ids
 * in the environment as RAZORPAY_PLAN_ID_USD / RAZORPAY_PLAN_ID_INR.
 */

const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment.");
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;

async function createPlan(currency, amount) {
  const res = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: `Allr workspace (${currency})`,
        description: "One Allr workspace, billed monthly.",
        amount,
        currency,
      },
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error(`${currency}: ${res.status}`, body.error ?? body);
    process.exit(1);
  }
  return body.id;
}

const usd = await createPlan("USD", 30_00);
const inr = await createPlan("INR", 2_499_00);
console.log(`RAZORPAY_PLAN_ID_USD=${usd}`);
console.log(`RAZORPAY_PLAN_ID_INR=${inr}`);
console.log(`\nMode: ${id.startsWith("rzp_test") ? "TEST" : "LIVE"}`);
