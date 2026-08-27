# Waitlist on Firebase (Firestore)

Signups from the site go straight into a Firestore collection called `waitlist`,
one document per email. The browser can only **create**; it can never read or
list the collection, so the public web API key exposes nothing.

## One-time setup

1. Firebase console → create a project (Spark / free is enough).
2. Build → Firestore Database → Create database → production mode.
3. Rules tab → paste [`firestore.rules`](./firestore.rules) → Publish.
4. Project settings → General → *Your apps* → add a **Web** app → copy
   `projectId` and `apiKey`.
5. GitHub → this repo → Settings → Secrets and variables → Actions →
   **Secrets** → add:
   - `FIREBASE_PROJECT_ID` — the `projectId`
   - `FIREBASE_API_KEY` — the web `apiKey` (public by design; the rules are the security)
6. Push to `main`. The Pages workflow reads both secrets at build time and
   bakes them into the static site.

## How it works

`src/components/WaitlistForm.tsx` calls the Firestore REST API:

```
POST https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/waitlist?documentId={sha256(email)}&key={apiKey}
```

The document id is the SHA-256 of the lower-cased email, so a second signup
with the same address is rejected by Firestore (409) and shown as
"you're already on the list". Fields: `email`, `source`, `userAgent`,
`createdAt` (server time).

## Reading the list

Firebase console → Firestore → `waitlist`, or export with the Firebase CLI:

```
firebase firestore:export ./waitlist-export --collection-ids waitlist
```

## Hardening later (optional)

- **App Check** (reCAPTCHA v3) stops scripted spam; enforce it on Firestore
  once enabled.
- A Cloud Function on `waitlist/{id}` create can send the welcome email and
  compute a position (needs the Blaze plan).
