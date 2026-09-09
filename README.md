# allr.github.io

The Allr marketing site and the signed-in account area, in one Next.js app
served from Vercel.

- `/`, `/app`, `/download`, `/privacy`, `/terms` — the public site
- `/login`, `/account/**` — Google sign-in and the early-access journey
- `/api/**` — the account API, running with a Firebase service account
- `/design` — the living design spec (noindex, URL only)

Before changing anything, read [`AGENTS.md`](./AGENTS.md). The contracts it
points at — [`DESIGN.md`](./DESIGN.md) and [`MOTION.md`](./MOTION.md) — are
binding, and §16 of DESIGN.md records decisions that are not to be reopened
casually.

## Running it

```
pnpm install
pnpm dev              # http://localhost:3000, against the live Firebase project
```

Anything touching accounts should be run against the emulator instead — see
below. `pnpm dev` points at whatever `.env.local` names, which is production.

## The Firebase emulator

Accounts, profiles and the security rules all run locally. You need a JVM: the
Auth and Firestore emulators are Java.

```
pnpm emulate          # in one terminal
pnpm dev:emulated     # in another
```

| Emulator | Port | |
|---|---|---|
| Auth | `9099` | |
| Firestore | `8571` | not 8080 |
| Emulator UI | `4401` | not 4000 — http://127.0.0.1:4401 |
| Hub / logging | `4400` / `4501` | |

**The ports are not Firebase's defaults on purpose.** 8080 and 4000 are heavily
contested on a developer machine — a local reverse proxy or an LLM gateway will
have taken them long before this project asks. They are declared once, in
[`firebase.json`](./firebase.json); `next.config.ts` reads them from there and
inlines them for the browser, and the tests read them too, so changing a port is
a one-line edit.

**Give the first start a few minutes.** `firebase-tools` loads a large bundle
and a 63 MB Firestore JAR before it prints anything, and on a machine with busy
disks that has taken over three minutes here — with the Emulator UI binding
*last*. `pnpm emulate` names the command and the ports up front and says the
wait is expected, because silence at that point is otherwise indistinguishable
from a hang. It is not stuck.

`pnpm dev:emulated` sets `NEXT_PUBLIC_FIREBASE_EMULATOR=1` plus
`FIREBASE_AUTH_EMULATOR_HOST` and `FIRESTORE_EMULATOR_HOST`, which point the
browser SDK, the server's Admin SDK **and** the waitlist's REST calls at the
emulator — so a test signup on the homepage cannot land in the production list.

Everything you create is written to `firebase/seed/` on exit (gitignored) and
imported on the next start. The project id is `demo-allr`, and the `demo-`
prefix is a safety property rather than a name: under it the emulator holds no
credentials and cannot reach a real Firebase project.

Google sign-in against the Auth emulator never contacts Google. *Continue with
Google* opens the emulator's own chooser, where you invent an account.

To populate the download links locally:

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:8571 FIREBASE_PROJECT_ID=demo-allr pnpm seed:app-config
```

## Tests

```
pnpm test             # age gate + Firestore rules
pnpm test:age         # the 18+ calendar arithmetic, no emulator needed
pnpm test:rules       # starts an emulator of its own, then throws it away
pnpm verify:journey   # the whole early-access walk; needs emulate + dev:emulated
```

`pnpm test:rules` **erases** the emulator it runs against, which is why it
starts its own and why the suites refuse to run without `ALLR_TEST_EMULATOR=1`.
Running `node --test firebase/*.test.mjs` by hand against an emulator you are
using would delete the account you are signed in as — that has happened, hence
the guard.

`pnpm verify:journey` is safe against a running emulator: it uses a fresh
address per run and touches nothing else.

## Environment

Copy [`.env.example`](./.env.example) to `.env.local`. The `NEXT_PUBLIC_*`
Firebase values are public by design — the API key identifies a project, it does
not authorise anything, and
[`firebase/firestore.rules`](./firebase/firestore.rules) is what guards
everything the browser touches.

`FIREBASE_SERVICE_ACCOUNT` is the exception and must never be committed. It is
the privileged half: the only thing that can create a profile, claim an email
address, or set the workspace and trial fields. Set it in Vercel's environment
variables. Local development needs none of this — against the emulator the Admin
SDK uses no credential at all.

## Deploying

Vercel builds and serves the app. Firestore rules deploy separately, from
[`.github/workflows/deploy-firestore-rules.yml`](./.github/workflows/deploy-firestore-rules.yml),
on every push to `main` that touches `firebase/`.

`firebase/README.md` covers the account model, what the rules enforce, and the
console steps needed before real Google sign-in works.

## Other commands

```
pnpm build            # production build
pnpm lint             # eslint (public/docs is committed and noisy; use `npx eslint src`)
pnpm generate-icons   # every favicon, from src/app/icon.svg
pnpm generate-og      # the share image
pnpm sync-docs        # copy the built Docusaurus site into public/docs
```
