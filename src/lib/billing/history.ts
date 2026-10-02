/**
 * Billing history, pure: subscription invoices (from Razorpay) and credit
 * packs (from our purchase ledger) as one dated list, newest first.
 */

export type HistoryItem = {
  id: string;
  kind: "subscription" | "credit";
  /** ISO 8601. */
  at: string;
  amountMinor: number;
  currency: string;
  /** "paid" | "due" | "failed" — only paid items moved money. */
  status: "paid" | "due" | "failed";
  description: string;
  /** Razorpay's hosted receipt, when there is one. */
  receiptUrl: string | null;
};

type Invoice = {
  id: string;
  status: string;
  amount?: number;
  amount_paid?: number;
  currency?: string;
  paid_at?: number | null;
  date?: number | null;
  short_url?: string | null;
  billing_start?: number | null;
  billing_end?: number | null;
};

type Purchase = { id: string; createdAt: string | null; amountMinor: number; currency: string; creditUsd: number };

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);
const day = (unix: number) =>
  new Date(unix * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function buildHistory(invoices: Invoice[], purchases: Purchase[]): HistoryItem[] {
  const out: HistoryItem[] = [];
  for (const inv of invoices) {
    // Drafts and cancelled invoices never asked anyone for money.
    if (inv.status === "draft" || inv.status === "cancelled") continue;
    const at = iso(inv.paid_at) ?? iso(inv.date);
    if (!at) continue;
    const paid = inv.status === "paid";
    out.push({
      id: inv.id,
      kind: "subscription",
      at,
      amountMinor: paid ? (inv.amount_paid ?? inv.amount ?? 0) : (inv.amount ?? 0),
      currency: inv.currency ?? "INR",
      status: paid ? "paid" : inv.status === "expired" ? "failed" : "due",
      description:
        inv.billing_start && inv.billing_end
          ? `Workspace · ${day(inv.billing_start)} – ${day(inv.billing_end)}`
          : "Workspace subscription",
      receiptUrl: inv.short_url ?? null,
    });
  }
  for (const p of purchases) {
    if (!p.createdAt) continue;
    out.push({
      id: p.id,
      kind: "credit",
      at: p.createdAt,
      amountMinor: p.amountMinor,
      currency: p.currency,
      status: "paid",
      description: `AI credit · $${p.creditUsd.toFixed(2)}`,
      receiptUrl: null,
    });
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** "₹2,499" / "$30" / "$9.20" from minor units. */
export function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : `${currency} `;
  const digits = Number.isInteger(major) ? 0 : 2;
  return `${symbol}${major.toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
