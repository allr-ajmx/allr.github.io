import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "./admin";
import { ApiError, forbidden, unauthorized } from "./errors";

/**
 * Who is calling, proven rather than claimed.
 *
 * Every account route goes through this. It is where "there is no other way to
 * sign up" stops being a statement about the UI and becomes something the
 * server enforces: a token minted by any provider other than Google is refused
 * here, so adding a password form — or calling the API with a token from one —
 * gets nobody an account.
 *
 * `email_verified` is checked as well. Google always sets it, which is exactly
 * why it is cheap to require: it costs a real sign-in nothing and it means the
 * address on the profile is one the person demonstrably controls, rather than
 * one they typed.
 */
export type Caller = {
  uid: string;
  /** Lower-cased, straight off the verified token — never from the request body. */
  email: string;
  name: string | null;
  token: DecodedIdToken;
};

export async function requireUser(request: Request): Promise<Caller> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw unauthorized();
  }

  let decoded: DecodedIdToken;
  try {
    // checkRevoked: a signed-out or disabled session must stop working here,
    // not whenever the token happens to expire.
    decoded = await adminAuth().verifyIdToken(token, true);
  } catch (error) {
    // Anything the Admin SDK itself raises — a missing service account, a key
    // that will not parse — comes from `adminAuth()`, inside this same try.
    // Those are ours to fix and must not be dressed up as the visitor's
    // session having expired.
    if (error instanceof ApiError) throw error;
    throw unauthorized("That session has expired. Sign in again?");
  }

  if (decoded.firebase?.sign_in_provider !== "google.com") {
    throw forbidden(
      "provider",
      "Allr accounts are Google accounts. There is no other way to sign in.",
    );
  }
  if (decoded.email_verified !== true || !decoded.email) {
    throw forbidden(
      "unverified",
      "We need a verified email address before we can create an account.",
    );
  }

  return {
    uid: decoded.uid,
    email: decoded.email.toLowerCase(),
    name: (decoded.name as string | undefined) ?? null,
    token: decoded,
  };
}
