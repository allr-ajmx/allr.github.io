/**
 * Create the monthly Razorpay plans the catalog (src/lib/billing/plans.ts)
 * needs, and print the env lines to paste into Vercel.
 *
 *   node scripts/razorpay-setup.mjs [plan …]
 *
 * Keys come from RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET if set; otherwise it
 * asks (the secret hidden). It shows the mode (TEST/LIVE) and asks before
 * creating anything.
 *
 * With no arguments it creates all four. Name only what's missing, e.g.
 *   node scripts/razorpay-setup.mjs workspace_usd workspace_inr ai_inr
 * (ai_usd at $30 already exists from before the two-plan change).
 *
 * Prices are read from plans.ts, so this can't drift from what checkout asks.
 */
import { client, closePrompts, confirm, quietTypeWarnings, razorpayKeys } from "./lib/razorpay-cli.mjs";

quietTypeWarnings();
const { PLANS, INR_PAISE_PER_USD } = await import("../src/lib/billing/plans.ts");

const ALL = {
  workspace_usd: { plan: "workspace", currency: "USD", env: "RAZORPAY_PLAN_ID_WORKSPACE_USD" },
  workspace_inr: { plan: "workspace", currency: "INR", env: "RAZORPAY_PLAN_ID_WORKSPACE_INR" },
  credit_usd: { unit: true, currency: "USD", amount: 100, env: "RAZORPAY_PLAN_ID_CREDIT_USD", label: "$1 AI credit" },
  credit_inr: { unit: true, currency: "INR", amount: INR_PAISE_PER_USD, env: "RAZORPAY_PLAN_ID_CREDIT_INR", label: "₹89.90 AI credit" },
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ALL);
for (const w of wanted) {
  if (!ALL[w]) {
    console.error(`Unknown plan "${w}". Choose from: ${Object.keys(ALL).join(", ")}`);
    process.exit(1);
  }
}

const keys = await razorpayKeys();
const rzp = client(keys);

console.log(`\nMode: ${keys.mode}. About to create:`);
for (const w of wanted) {
  const item = ALL[w];
  if (item.unit) console.log(`  · ${item.label}/month (${item.currency}), quantity = dollars`);
  else console.log(`  · ${PLANS[item.plan].name} — ${PLANS[item.plan].display[item.currency]}/month (${item.currency})`);
}
const go = await confirm("\nCreate these plans?");
closePrompts();
if (!go) {
  console.log("Nothing created.");
  process.exit(0);
}

console.log("");
for (const w of wanted) {
  const item = ALL[w];
  const unit = Boolean(item.unit);
  const p = unit ? null : PLANS[item.plan];
  try {
    const created = await rzp("POST", "/plans", {
      period: "monthly",
      interval: 1,
      item: unit
        ? {
            name: `Allr ${item.label}`,
            description: "One dollar of Allr AI credit, billed monthly. Quantity is the dollar amount.",
            amount: item.amount,
            currency: item.currency,
          }
        : {
            name: `Allr ${p.name} (${item.currency})`,
            description: "One Allr workspace, billed monthly.",
            amount: p.price[item.currency],
            currency: item.currency,
          },
    });
    console.log(unit
      ? `${item.env}=${created.id}   # ${item.label}/month`
      : `${item.env}=${created.id}   # ${p.name}, ${p.display[item.currency]}/month`);
  } catch (e) {
    console.error(`${w}: ${e.message}`);
    if (item.currency === "USD") console.error("  (USD plans need International payments enabled on the Razorpay account.)");
    process.exitCode = 1;
  }
}
console.log(`\nPaste the lines above into Vercel → allr-main → Settings → Environment Variables (${keys.mode === "LIVE" ? "Production" : "Preview"}), then redeploy.`);
