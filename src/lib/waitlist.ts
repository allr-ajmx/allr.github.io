/**
 * Where a signup goes.
 *
 * The site is a static export (`output: "export"`), so there is no server and
 * no API route: the browser writes straight to Firestore, and the rules in
 * `firebase/firestore.rules` are the whole security boundary. The public web
 * API key is public by design.
 *
 * Two lists, never one (DESIGN.md §16). Both use the SHA-256 of the email as
 * the document id, so a second signup with the same address is refused — which
 * is exactly why they cannot share a collection: someone already on the
 * early-access list would be turned away from the mobile beta.
 */

export type ListId = "early" | "beta";
export type Platform = "android" | "ios" | "either";

type ListSpec = {
  /** Firestore collection — also the name of its rule block. */
  collection: string;
  /** Subject line for the FormSubmit fallback. */
  subject: string;
};

/** The only place a collection name is written. Pages pass a `ListId`. */
const LISTS: Record<ListId, ListSpec> = {
  early: { collection: "waitlist", subject: "Allr early access" },
  beta: { collection: "beta_signups", subject: "Allr mobile beta" },
};

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const WAITLIST_URL = process.env.NEXT_PUBLIC_WAITLIST_URL;
const WAITLIST_EMAIL = process.env.NEXT_PUBLIC_WAITLIST_EMAIL;

/** Thrown when the address is already on that list. Firestore path only. */
export class AlreadyOnList extends Error {}

/** Thrown when no backend is configured, so nothing could have been saved. */
export class ListUnavailable extends Error {}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Which deployment the signup came from, e.g. "https://allr.work". */
const source = () =>
  (typeof location !== "undefined" ? location.origin : "unknown").slice(0, 64);

/**
 * Add an address to one of the lists.
 *
 * The mobile beta requires a platform: its rule block rejects a document
 * without one, so the type makes it impossible to send a write that cannot
 * succeed.
 */
export async function joinList(
  list: "early",
  input: { email: string },
): Promise<void>;
export async function joinList(
  list: "beta",
  input: { email: string; platform: Platform },
): Promise<void>;
export async function joinList(
  list: ListId,
  input: { email: string; platform?: Platform },
): Promise<void> {
  const { collection, subject } = LISTS[list];
  const email = input.email;
  // Only `beta_signups` allows the field; the `waitlist` rule uses hasOnly()
  // and would refuse a document carrying it.
  const platform = list === "beta" ? input.platform : undefined;

  // 1. Firestore, straight from the browser. Rules allow create only; the
  //    document id is the hash of the email so duplicates are refused (409).
  if (FIREBASE_PROJECT_ID && FIREBASE_API_KEY) {
    const id = await sha256Hex(email);
    const url =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
      `/databases/(default)/documents/${collection}?documentId=${id}&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          source: { stringValue: source() },
          userAgent: { stringValue: navigator.userAgent.slice(0, 512) },
          createdAt: { timestampValue: new Date().toISOString() },
          ...(platform ? { platform: { stringValue: platform } } : {}),
        },
      }),
    });
    if (res.status === 409) throw new AlreadyOnList();
    if (!res.ok) throw new Error("waitlist");
    return;
  }

  // 2. A generic JSON endpoint. It gets the list as well as the address —
  //    without it the two lists would arrive indistinguishable.
  if (WAITLIST_URL) {
    const res = await fetch(WAITLIST_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, source: source(), list, collection, platform }),
    });
    if (!res.ok) throw new Error("waitlist");
    return;
  }

  // 3. FormSubmit, one subject line per list.
  if (WAITLIST_EMAIL) {
    const res = await fetch(`https://formsubmit.co/ajax/${WAITLIST_EMAIL}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        list,
        ...(platform ? { platform } : {}),
        _subject: subject,
      }),
    });
    if (!res.ok) throw new Error("waitlist");
    return;
  }

  // 4. Nothing configured. In development that is normal — keep the address
  //    where `next dev` can show it. In production it means the build shipped
  //    without its environment, and telling someone they are on a list that
  //    does not exist is worse than telling them to try again.
  if (process.env.NODE_ENV === "production") throw new ListUnavailable();

  const key = `allr.waitlist.${list}`;
  const prev: { email: string; at: number; platform?: string }[] = JSON.parse(
    localStorage.getItem(key) || "[]",
  );
  localStorage.setItem(
    key,
    JSON.stringify([...prev, { email, at: Date.now(), platform }]),
  );
}
