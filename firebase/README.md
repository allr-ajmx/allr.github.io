# The waitlist on Firebase (Firestore)

Signups from the site go straight into Firestore, one document per email. The
browser can only **create**; it can never read or list a collection, so the
public web API key exposes nothing. The rules in
[`firestore.rules`](./firestore.rules) are the entire security boundary.

There are two lists, and they are separate on purpose:

| List | `ListId` | Collection | Written by | Extra field |
|---|---|---|---|---|
| Early access | `early` | `waitlist` | The form on `/#early-access` | — |
| Mobile closed beta | `beta` | `beta_signups` | The form on `/app#get` | `platform` — `android`, `ios` or `either` |

`platform` is pre-selected from the visitor's device and can be changed by
tapping a chip. `either` means the device could not be identified — a desktop
browser, usually — not that the person chose it. iPad counts as `ios` and an
Android tablet as `android`; tablets are not tracked separately.

Both use the SHA-256 of the lower-cased email as the document id, so a second
signup with the same address is refused. That is exactly why they cannot share
a collection: someone already on the early-access list would be turned away
from the mobile beta.

Only [`src/lib/waitlist.ts`](../src/lib/waitlist.ts) names a collection. Pages
pass a `ListId` to `WaitlistForm`, never a collection name.

## One-time setup

1. Firebase console → create a project (Spark / free is enough).
2. Build → Firestore Database → Create database → production mode.
3. Project settings → General → *Your apps* → add a **Web** app → copy
   `projectId` and `apiKey`.
4. Put the project id in [`.firebaserc`](../.firebaserc), replacing
   `REPLACE_WITH_FIREBASE_PROJECT_ID`.
5. Copy [`.env.example`](../.env.example) to `.env.local` and fill in
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY`.
6. Add the same two values wherever the site is built:
   - **GitHub Actions** → repo Settings → Secrets and variables → Actions →
     Secrets → `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY`. The Pages workflow
     maps them to the `NEXT_PUBLIC_` names at build time.
   - **Vercel** → project Settings → Environment Variables →
     `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY`.
7. Add a **service account** for the rules deploy — see below.
8. Push to `main`. The rules deploy and the site build both run.

`pnpm build` refuses to run in CI (or on Vercel) when none of these are set,
because the alternative is shipping a form that silently drops every address.
Locally it prints a warning and carries on.

## Deploying the rules

`firestore.rules` is deployed by
[`.github/workflows/deploy-firestore-rules.yml`](../.github/workflows/deploy-firestore-rules.yml)
on every push to `main` that touches `firebase/`, and on demand via *Run
workflow*. The file in this repo is the live rule set — there is no longer a
step where someone pastes it into the console.

It authenticates with a service account rather than `firebase login:ci`, which
is deprecated:

1. Google Cloud console → the Firebase project → IAM & Admin → Service Accounts
   → create one, e.g. `github-rules-deploy`.
2. Give it the **Firebase Rules Admin** role.
3. Keys → Add key → JSON → download.
4. GitHub → repo Settings → Secrets → `FIREBASE_SERVICE_ACCOUNT`, pasting the
   whole JSON file.

Without that secret the workflow skips instead of failing. To deploy by hand:

```
npx firebase-tools deploy --only firestore:rules
```

**A new collection needs a new rule block.** Until one exists, every write to it
is refused and the form shows its error state.

## How a signup travels

`src/lib/waitlist.ts` tries four backends in order and stops at the first one
that is configured:

1. **Firestore REST** — the live path.
   ```
   POST https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/{collection}?documentId={sha256(email)}&key={apiKey}
   ```
   Fields: `email`, `source` (the submitting origin, e.g. `https://allr.work`),
   `userAgent`, `createdAt`, and `platform` for the beta. A duplicate comes back
   `409`, which the form shows as "you're already on the list".
2. **`NEXT_PUBLIC_WAITLIST_URL`** — a JSON POST of
   `{ email, source, list, collection, platform }`.
3. **`NEXT_PUBLIC_WAITLIST_EMAIL`** — formsubmit.co, one subject line per list.
4. **Nothing configured** — in development the address goes to
   `localStorage["allr.waitlist.early" | "allr.waitlist.beta"]`. In a production
   build this throws instead, and the form says the list is unreachable.

Duplicate detection exists **only** on the Firestore path; the two fallbacks
cannot dedupe.

## Reading the lists

Firebase console → Firestore → `waitlist` or `beta_signups`, or export:

```
firebase firestore:export ./waitlist-export --collection-ids waitlist,beta_signups
```

## Hardening later (optional)

- **App Check** (reCAPTCHA v3) stops scripted spam; enforce it on Firestore
  once enabled.
- A Cloud Function on `waitlist/{id}` create can send the welcome email and
  compute a position (needs the Blaze plan).
