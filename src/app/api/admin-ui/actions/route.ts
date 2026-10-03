import { requireAdminUser } from "@/lib/server/admin-gate";
import { ApiError, toResponse } from "@/lib/server/errors";
import { RazorpayError } from "@/lib/server/razorpay";
import { applyAdminAction, parseAction } from "@/lib/server/admin-actions";

/** An admin pulls a lever. Verified token + allowlist; recorded with who. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser(request);
    const action = parseAction(await request.json().catch(() => null));
    await applyAdminAction(admin, action);
    return Response.json({ ok: true });
  } catch (error) {
    // Admins get Razorpay's own words, not the customer-facing reassurance.
    if (error instanceof RazorpayError) {
      return toResponse(
        new ApiError(502, "billing-upstream",
          `Razorpay refused (${error.upstreamStatus}${error.upstreamCode ? ` ${error.upstreamCode}` : ""}): ${error.description || "no detail"}. Nothing was changed.`),
      );
    }
    return toResponse(error);
  }
}
