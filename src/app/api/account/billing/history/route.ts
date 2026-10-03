import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { readOrAdoptProfile } from "@/lib/server/profiles";
import { requireUser } from "@/lib/server/session";
import { badRequest, toResponse } from "@/lib/server/errors";
import { isMissingOnRazorpay, listSubscriptionInvoices } from "@/lib/server/razorpay";
import { buildHistory } from "@/lib/billing/history";

/**
 * The caller's payments: subscription invoices from Razorpay and credit packs
 * from our own ledger. Razorpay being down must not blank the page — the packs
 * still show, and `invoicesUnavailable` says the rest is missing, not absent.
 */
export async function GET(request: Request) {
  try {
    const caller = await requireUser(request);
    const profile = await readOrAdoptProfile(caller);
    if (!profile) throw badRequest("no-profile", "Make an account first.");

    const db = adminDb();
    // Every subscription this account has had (a resubscribe starts a new one),
    // current first; capped so a long history can't fan out unbounded calls.
    const events = await db.collection("billing_events").where("uid", "==", caller.uid).limit(200).get();
    const subscriptionIds = [
      ...new Set([
        profile.billing?.subscriptionId,
        ...events.docs.map((d) => d.data().subscriptionId as string | undefined),
      ].filter((x): x is string => Boolean(x))),
    ].slice(0, 6);

    const [invoiceLists, purchases] = await Promise.all([
      Promise.all(
        subscriptionIds.map((id) =>
          listSubscriptionInvoices(id).catch((e) => {
            // An id Razorpay doesn't know (test mode) simply has no invoices.
            if (isMissingOnRazorpay(e)) return [];
            console.error(`[billing] history: invoices for ${id} unavailable`, e);
            return null;
          }),
        ),
      ),
      db.collection("credit_purchases").where("uid", "==", caller.uid).limit(100).get(),
    ]);
    const invoices = invoiceLists.some((l) => l === null) ? null : invoiceLists.flat();
    const partial = invoiceLists.flatMap((l) => l ?? []);

    const items = buildHistory(
      partial,
      purchases.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          createdAt: x.createdAt instanceof Timestamp ? x.createdAt.toDate().toISOString() : null,
          amountMinor: Number(x.amountMinor ?? 0),
          currency: String(x.currency ?? "USD"),
          creditUsd: Number(x.creditUsd ?? 0),
        };
      }),
    );
    return Response.json({ items, invoicesUnavailable: invoices === null });
  } catch (error) {
    return toResponse(error);
  }
}
