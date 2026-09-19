# Firebase: the waitlist, and accounts

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

**This key is for the workflow only.** Vercel has a variable with the same name
and it must hold a *different* key — see
[The server's service account](#the-servers-service-account). Rules Admin can
publish a rule set and cannot read a single document, so reusing it there gives
an account API that authenticates and then fails every Firestore call.

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

---

# Accounts

Sign-in is Google and nothing else (DESIGN.md §16). The site runs on Vercel with
a server, and that server is the only thing that writes a profile: the browser
sends its Google ID token to `/api/account/**`, which verifies it and uses the
Admin SDK ([`src/lib/server/admin.ts`](../src/lib/server/admin.ts)). The Admin
SDK is not bound by [`firestore.rules`](./firestore.rules); the rules are what
bind the browser, and for `users` they allow one thing — reading your own
document.

One document per person at `users/{uid}`, keyed by the Firebase Auth uid, which
is what lets the rules say "your own and nobody else's" without a query. It
holds the legal minimum needed to sell to that person later: legal name, date of
birth, country of residence, the two consent versions, and the marketing opt-in.
Accounts are individual only. **Billing address and tax ID are checkout
questions and are deliberately not here.**

Three things are enforced where the form cannot reach:

- the email on the document is taken from the verified auth token, never from
  the request body (`src/lib/server/session.ts`);
- the date of birth must be at least 18 years ago, checked by the server on
  every create and update, so an under-age account cannot be made by anything,
  form or script;
- the rules refuse every client write to `users`, and `users` can never be
  listed — only fetched one document at a time by its owner.

Nothing has to be created in Firestore beforehand. `users` and `user_emails`
appear when the first person registers; an empty database is a working one.

## The server's service account

`FIREBASE_SERVICE_ACCOUNT` in Vercel is the Admin SDK's credential:

1. Firebase console → Project settings → **Service accounts** → *Generate new
   private key*. The account is named `firebase-adminsdk-…@<project>` and
   already holds the Auth and Firestore roles it needs.
2. Vercel → project Settings → Environment Variables →
   `FIREBASE_SERVICE_ACCOUNT`, pasting the whole JSON file, for **Production and
   Preview**.
3. Redeploy. Vercel reads environment variables at deploy time, so a deployment
   built before the variable existed will never see it.

It is not the rules-deploy key above. They share a name because each lives in a
different product's secret store; they are different accounts with different
roles.

### When a deployment fails and local does not

What each failure looks like from outside:

| Response from `/api/account/**` | Meaning |
|---|---|
| `503` `unconfigured` | The variable is missing from *this* deployment — wrong environment ticked, or not redeployed since it was added. |
| `401` with a valid sign-in | The key did not initialise: not valid JSON, a damaged private key, or a key for another project. |
| `500` as JSON | The key works and a Firestore call failed. The server log has the gRPC code; `7 PERMISSION_DENIED` means the account lacks a Firestore role. |
| `500` as an HTML page | The route crashed while loading, before any handler ran. Nothing the API returns can describe this — read the logs. |

The browser is never told why a 500 happened. The reason is in Vercel's runtime
logs — the project's **Logs** tab, or:

```
npx vercel logs --environment preview --since 30m --status-code 500 --expand
npx vercel curl /api/account/me/ --deployment <preview-url>   # past the SSO wall
```

Vercel's function runtime is stricter than a developer machine about one thing
that has bitten this project: it refuses `require()` of an ES module. To run a
local production build under the same restriction:

```
pnpm build && NODE_OPTIONS=--no-experimental-require-module pnpm start
```

That is what the `jwks-rsa` override in `pnpm-workspace.yaml` is for.

## Running the emulator

You need a JVM (the Firestore and Auth emulators are Java). Then, in two
terminals:

```
pnpm emulate        # Auth :9099, Firestore :8571, Emulator UI :4401
pnpm dev:emulated   # next dev, pointed at both
```

**The ports are not Firebase's defaults.** 8080 and 4000 are contested on a
developer machine — a local reverse proxy, an LLM gateway or a spare web server
will have taken them long before this project asks. They are declared once, in
`firebase.json`; `next.config.ts` reads them from there and inlines them for the
browser, and the tests read them too, so changing a port is a one-line edit.

**Give the first start a minute.** `firebase-tools` loads a large bundle before
it prints anything, and on a machine with busy disks that can take well over a
minute — `pnpm emulate` names the command and says so, because silence at that
point is otherwise indistinguishable from a hang.

`pnpm dev:emulated` sets `NEXT_PUBLIC_FIREBASE_EMULATOR=1`, which redirects the
Auth SDK, the Firestore SDK **and** the waitlist's REST calls to the emulator —
so a test signup on the homepage cannot land in the production list either.

The emulator runs under the project id `demo-allr`. The `demo-` prefix is not
cosmetic: under it the emulator has no credentials and physically cannot reach a
real Firebase project. Whatever you create while testing is written to
`firebase/seed/` on exit (gitignored) and imported on the next start.

Google sign-in against the Auth emulator does not talk to Google. Clicking
*Continue with Google* opens the emulator's own chooser, where you invent an
account. That is enough to exercise everything except Google's own consent
screen.

## Testing the rules

```
pnpm test:rules
```

Starts the Firestore emulator, runs [`rules.test.mjs`](./rules.test.mjs) against
the real rule file, and shuts it down. These rules are the only thing between a
browser and the database, so they are the part of this repo that is worth
testing: the suite covers who may create, read, correct and delete a profile,
the age gate, and a set of regression cases proving the waitlist rules still
behave exactly as they did.

The emulator logs an `evaluation error` for whichever of the create/update
branches does not apply to a given write. That is expected — a rule that errors
denies — and the tests are what pin down the branch that does apply.

## Going live

To let real people sign in, in the Firebase console for `allr-prod`:

1. **Authentication → Sign-in method → Google → Enable.** Set the support email.
2. **Authentication → Settings → Authorized domains** — add every host the site
   is served from: `localhost`, the Vercel domains (previews included, if people
   are to sign in on them), and `allr.work`. A domain that is not listed gets
   `auth/unauthorized-domain` and nothing else.
3. Check that `NEXT_PUBLIC_FIREBASE_PROJECT_ID` and `NEXT_PUBLIC_FIREBASE_API_KEY`
   are set wherever the site is built — they already are for the waitlist, and
   accounts use the same pair.
4. Give Vercel [the server's service account](#the-servers-service-account).
   Without it every account route answers `503`.
5. Make sure the `users` rule block is deployed — `deploy-firestore-rules.yml`
   runs on a push to `main`, or by hand from the Actions tab. Nothing in the
   account area depends on it, because every read and write goes through the
   API; it is there so that a browser holding the public key cannot write a
   profile or list the collection.

Skipping either of the first two steps produces a specific, recognisable
failure, and `/login` names it rather than telling people to try again forever:

| Missed step | Firebase error | What the page says |
|---|---|---|
| Provider not enabled | `auth/operation-not-allowed` | "Sign-in isn't switched on yet. That one is on us" |
| Domain not authorized | `auth/unauthorized-domain` | the same line — both are ours to fix, not the visitor's |

A build with no `NEXT_PUBLIC_FIREBASE_*` at all is different again: there is no
button to press, and the page says sign-in isn't switched on in this build. In
practice that will not happen on a deploy, because the waitlist needs the same
two values and `prebuild` already refuses to build in CI without them.
