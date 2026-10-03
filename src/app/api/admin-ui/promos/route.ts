import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { requireAdminUser } from "@/lib/server/admin-gate";
import { toResponse } from "@/lib/server/errors";
import { CODES, REDEMPTIONS, codeFromDoc } from "@/lib/server/promo";

/** Promo codes and who redeemed them. Admin-gated; read-only. */
const iso = (v: unknown): string | null =>
  v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : null;

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const db = adminDb();
    const [codes, redemptions] = await Promise.all([
      db.collection(CODES).limit(200).get(),
      db.collection(REDEMPTIONS).orderBy("redeemedAt", "desc").limit(200).get(),
    ]);
    return Response.json({
      codes: codes.docs
        .map((d) => ({ ...codeFromDoc(d.data())!, createdAt: iso(d.data().createdAt), createdBy: d.data().createdBy ?? null }))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
      redemptions: redemptions.docs.map((d) => ({
        email: String(d.data().email ?? ""),
        code: String(d.data().code ?? ""),
        redeemedAt: iso(d.data().redeemedAt),
        endsAt: iso(d.data().endsAt),
      })),
    });
  } catch (error) {
    return toResponse(error);
  }
}
