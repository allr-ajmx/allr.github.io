/**
 * One-off check, in Razorpay TEST mode: when a subscription starts on a
 * future date (how a plan change works), is an upfront amount ("addon")
 * charged at checkout — for card and for UPI?
 *
 *   node scripts/razorpay-verify-upfront.mjs            # create two test subscriptions, open a local page
 *   node scripts/razorpay-verify-upfront.mjs check      # after paying both: report
 *   node scripts/razorpay-verify-upfront.mjs cleanup    # cancel the two test subscriptions
 *
 * Uses TEST keys only (refuses live ones). Asks for them if not in the env.
 * Creates a throwaway ₹10/month test plan and two subscriptions that start in
 * 3 days, each with a ₹1 upfront amount, then serves http://localhost:4319 —
 * two buttons that open Razorpay Checkout exactly as the Billing page does.
 * Pay one with a test card, the other with test UPI (success@razorpay); then
 * stop it (Ctrl+C) and run `check`.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { client, closePrompts, razorpayKeys } from "./lib/razorpay-cli.mjs";

const STATE = "scripts/.razorpay-verify-upfront.json";
const keys = await razorpayKeys();
if (keys.mode !== "TEST") {
  console.error("This check only runs with TEST keys (rzp_test_…).");
  process.exit(1);
}
closePrompts();
const rzp = client(keys);

if (process.argv[2] === "cleanup") {
  if (!existsSync(STATE)) {
    console.log("Nothing to clean up.");
    process.exit(0);
  }
  const { subs } = JSON.parse(readFileSync(STATE, "utf8"));
  for (const { id, label } of subs) {
    try {
      await rzp("POST", `/subscriptions/${id}/cancel`, { cancel_at_cycle_end: 0 });
      console.log(`cancelled ${id} (${label})`);
    } catch (e) {
      console.log(`${id}: ${e.message}`);
    }
  }
  process.exit(0);
}

if (process.argv[2] === "check") {
  if (!existsSync(STATE)) {
    console.error("Run it once without `check` first.");
    process.exit(1);
  }
  const { subs } = JSON.parse(readFileSync(STATE, "utf8"));
  for (const { id, label } of subs) {
    const s = await rzp("GET", `/subscriptions/${id}`);
    const inv = await rzp("GET", `/invoices?subscription_id=${id}`);
    const paid = (inv.items ?? []).filter((i) => i.status === "paid");
    const upfront = paid.reduce((sum, i) => sum + (i.amount_paid ?? 0), 0);
    console.log(`\n${label}: ${id}`);
    console.log(`  status: ${s.status} (expect "authenticated" — mandate set, starts later)`);
    console.log(`  start_at: ${s.start_at ? new Date(s.start_at * 1000).toISOString() : "—"}`);
    console.log(`  paid at checkout: ${upfront / 100} INR across ${paid.length} invoice(s)`);
    console.log(
      upfront >= 100
        ? "  ✓ The upfront amount WAS charged at checkout — upgrades work as built."
        : s.status === "created"
          ? "  … Not paid yet — open the link and complete checkout first."
          : "  ✗ The upfront amount was NOT charged at checkout — upgrades need a separate one-off payment.",
    );
  }
  process.exit(0);
}

const plan = await rzp("POST", "/plans", {
  period: "monthly",
  interval: 1,
  item: { name: "Allr upfront-check (test)", amount: 10_00, currency: "INR", description: "Throwaway test plan" },
});
const customer = await rzp("POST", "/customers", { name: "Upfront check", email: "upfront-check@example.com", fail_existing: "0" });
const startAt = Math.floor(Date.now() / 1000) + 3 * 86_400;
const subs = [];
for (const label of ["Pay with a TEST CARD", "Pay with TEST UPI"]) {
  const sub = await rzp("POST", "/subscriptions", {
    plan_id: plan.id,
    customer_id: customer.id,
    total_count: 2,
    customer_notify: 0,
    start_at: startAt,
    addons: [{ item: { name: "Upfront check", amount: 100, currency: "INR" } }],
    notes: { purpose: "upfront-check" },
  });
  subs.push({ id: sub.id, label });
}
writeFileSync(STATE, JSON.stringify({ subs }, null, 2));

// The same Checkout the Billing page opens (checkout.js + subscription_id);
// only the public key id goes to the page.
const page = `<!doctype html><meta charset="utf-8"><title>Upfront check</title>
<style>body{font:16px system-ui;max-width:560px;margin:40px auto;padding:0 16px}button{font:inherit;padding:12px 16px;margin:8px 0;width:100%;cursor:pointer}
code{background:#f3f3f3;padding:2px 4px}#log{white-space:pre-wrap;margin-top:16px}</style>
<h1>Razorpay upfront-amount check (TEST)</h1>
<p>Each button opens Razorpay Checkout for a subscription that starts in 3 days with a ₹1 upfront amount.</p>
<p><b>Card:</b> <code>4718 6091 0820 4366</code>, any future expiry, any CVV, then <b>Success</b>.<br>
<b>UPI:</b> choose UPI and enter <code>success@razorpay</code>.</p>
${subs.map((x, i) => `<button onclick="pay(${i})">${x.label}</button>`).join("")}
<div id="log"></div>
<p>When both say “authorised”, stop the script (Ctrl+C) and run <code>node scripts/razorpay-verify-upfront.mjs check</code>.</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
const subs = ${JSON.stringify(subs)};
const log = (t) => { document.getElementById("log").textContent += t + "\\n"; };
function pay(i) {
  const rzp = new Razorpay({
    key: ${JSON.stringify(keys.id)},
    subscription_id: subs[i].id,
    name: "Allr (test)",
    description: "Upfront-amount check",
    handler: (r) => log(subs[i].label + ": authorised (" + r.razorpay_payment_id + ")"),
    modal: { ondismiss: () => log(subs[i].label + ": closed without paying") },
  });
  rzp.on("payment.failed", (r) => log(subs[i].label + ": FAILED — " + (r.error && r.error.description)));
  rzp.open();
}
</script>`;
createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page);
}).listen(4319, "127.0.0.1", () => {
  console.log(`
Open http://localhost:4319 in your browser and use the two buttons.
When both say "authorised", press Ctrl+C here, then run:

  node scripts/razorpay-verify-upfront.mjs check
`);
});
