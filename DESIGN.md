# Allr design vocabulary

This is the contract for every public Allr surface that a person *arrives* at — landing pages, campaigns, waitlists, launch emails, OG images. The living spec is **`/design`**. Tokens live in `src/app/globals.css`. Locked copy lives in `src/lib/brand.ts`.

Read this before changing copy, color, type, layout, or a component. Do not invent a second Allr.

The HTML prototype in `references/index.html` is historical. The Next app is canonical (tighter radii, letterpress hero, launch console tiles). If they disagree, the Next app wins — then this file is updated.

---

## 1. Product, in one breath

Allr is the **product-and-operations platform for the AI era**: a persistent **Cloud AI Workspace** on **web, desktop, and mobile** where people ideate, create, deploy, operate, maintain, and scale AI-enabled products.

Not a chatbot. Not a coding copilot. Not another pile of partial outputs.

You bring the brief. Allr holds the operating layer — so the product stays real after the generation step.

The name is the thesis: **allr, as in all.**

Quiet analogy (never the hero lead): WordPress standardized publishing infrastructure; Allr aims to standardize the repeated product-and-operations infrastructure under AI-enabled products.

---

## 2. Who we speak to

People and teams moving AI products from prototype to something that can run, reach customers, and be maintained.

| Audience | What they need from us |
|---|---|
| AI product builders | Dependable deploy, operate, and maintain — not only a prototype |
| Product teams | Shared workspace for experiments and continuous operation |
| Agencies & client teams | Repeatable delivery and ongoing maintenance per client |
| Business operators | Intelligence and workflows that keep running after the first build |

On the homepage, audiences are not proof cards. The hero shows one **Cloud AI Workspace** beat (`WORKSPACE_DEMO` in `brand.ts`) — ideate → build → live/operating. Named testimonials stay off the public site until we choose otherwise.

We do **not** lead with self-hosters, foundation-model claims, or investor narrative (raise, ARR, market size). Power-user language belongs in docs, not on the door.

---

## 2b. The Bloom — mark colour only

The mark still has six petals and six accent colours. Those colours remain the page’s accent system. They are **not** a catalogue of shipped finished-work types on the homepage.

| Petal | Colour | Historic label (colour only) |
|---|---|---|
| 0 | `#74926b` sage | Sites |
| 1 | `#f7c14c` honey | Decks |
| 2 | `#e6981a` amber | Sheets |
| 3 | `#f8dc8d` pale gold | Docs |
| 4 | `#34905e` deep green | Video |
| 5 | `#9bb289` light sage | Apps |

Rules: a petal shape (`PetalShape`) is the only decorative form we own — use it for bullets, numerals, backdrops and progress. Never add a seventh colour. **Desktop** status chips read **green**; **mobile** status chips read **orange** (honey/amber tokens — not a new hue). Do not number petals in copy. Registry: `src/lib/petals.ts`. `BloomJourney` is unimported on the homepage until product truth catches up.

## 3. Voice

**Mentor, not vendor.** Warm, not cute. Operating, not generating.

Speak as if you are sitting next to someone at a kitchen table at the end of the day — paper, lamplight, a product finally running. Short sentences. Concrete nouns (workspace, link, deploy, maintain). Second person: *you*.

The only first-person line we own is the promise:

> You bring the idea. We’ll take care of everything between you and ‘it’s live.’

### How it sounds

| Do | Don’t |
|---|---|
| “Your product is live.” | “We’ve leveraged our agentic pipeline to orchestrate a deploy.” |
| “It’s operating.” | “AI-powered presentation generation.” |
| “Cloud AI Workspace.” | “A unified ecosystem of capabilities.” |
| “Ideate.” | “Prompt the model.” |
| “Live.” | “Output artifact.” |
| “More outcome per dollar.” | Investor ARR / raise copy on the door. |

Prefer the words in `SAY` (`src/lib/brand.ts`). Never use the words in `NEVER_SAY`. If a sentence would also fit a YC launch post, rewrite it.

### Name casing

| Form | Where |
|---|---|
| `allr` | Wordmark next to the mark (Young Serif, lowercase) |
| `Allr` | Sentences, titles, metadata |
| `allr — as in all.` | Footer, quiet brand moments |
| Never `ALLR` | — |
| Never `AllR` | — |

### Calls to action (2026-09-17)

The hero and header show **Get Started** → `/login/` (account signup). Download stays on `/download`, Access (last), and `/app` — not the hero. Early access waitlist is off the public marketing door for this pass. `/download` links only real assets from the current release (`src/lib/releases.ts`) — no other links.

---

## 4. Locked phrases

Do not paraphrase these on a page. Import from `src/lib/brand.ts` or copy exactly.

| Role | Line |
|---|---|
| Tagline | the product-and-operations platform for the AI era |
| Eyebrow | Cloud AI Workspace |
| Hero headline | the product-and-operations platform for the AI era. |
| Subhead | A persistent workspace where you ideate, create, deploy, operate, and maintain AI-enabled products — on the web, on desktop, and on mobile. |
| Loop | Ideate. / Create. / Deploy. / Operate. / Maintain. / Scale. |
| Promise | You bring the idea. We’ll take care of everything between you and ‘it’s live.’ |
| Closing | Stop rebuilding the plumbing. Start operating. |
| Etymology | allr — as in all. |
| Reassurance | No credit card required. Your first project is on us. |

**Platform progress** (`PLATFORM_PROGRESS` in `brand.ts`): honest Available / In progress / Upcoming — Cloud AI Workspace, desktop (green), mobile (orange), memory, then upcoming research / product management / intelligence network / product development framework / billing rail. Do not imply creative outputs are already shipping as a catalogue.

**Roadmap** (`ROADMAP`): dedicated `/roadmap` page for upcoming detail. No investor milestones on the public site.

---

## 5. Color

Color is semantic, not decorative. Green means done. Honey means warmth and in-progress. Ink is pine, not black.

| Token | Hex | Meaning | Use |
|---|---|---|---|
| `paper` | `#FDFCF9` | Evening paper | Page wash, sticky header |
| `card` | `#FFFFFF` | A sheet on the desk | Surfaces, buttons (ghost) |
| `ink` | `#223B33` | Deep pine — steady | Headlines, body emphasis |
| `ink-soft` | `#5C7168` | Quiet pine | Body, captions, nav |
| `line` | `#E7E0D2` | Paper edge | Borders |
| `line-soft` | `#EFE9DC` | Softer edge | Header rule, chrome |
| `honey` | `#E9A83E` | Lamplight | Focus ring, nav underline, in-progress |
| `honey-deep` | `#B77E1F` | Aged brass | Secondary emphasis, asides |
| `honey-tint` | `#FBEFD8` | Warm wash | Selection, honey chips, tints |
| `honey-line` | `#F0DCB4` | Warm edge | Honey chips, hover mix |
| `green` | `#2E9E63` | Done / live | Primary button, live dot, checks |
| `green-deep` | `#1E7A49` | Accomplished | Button hover, swash text |
| `green-tint` | `#E4F4EA` | Done wash | Swash underline, live chips |
| `green-line` | `#C2E5D0` | Done edge | Live console, green chips |
| `sage-tint` | `#ECF2EC` | Quiet green | Card stickers, handled chips |
| `sage-line` | `#DCE8DD` | Quiet green edge | Handled chips |
| `clay-tint` | `#F6EDE2` | Warm clay | Card stickers |
| `alert` | `#A6543C` | Something needs fixing | Form error text, invalid field border |
| `alert-tint` | `#F9E9E4` | Error wash | The struck-through `NEVER_SAY` chips on `/design` |
| `alert-line` | `#EFCFC4` | Error edge | Those chips' border |

Ambient orbs are honey + green on paper. Never introduce a fourth hue (blue, purple, neon) on a welcome surface.

`alert` is the one exception, and it is a correction rather than an expansion: the same red was already
hardcoded twice — in `WaitlistForm.tsx` and on `/design` — before it had a name. It is a *state*, not a
brand hue: it may only say that something the person typed needs fixing. It never decorates, never fills a
surface, never appears on a page with no form on it, and never becomes a fourth accent.

**Forbidden:** generic Tailwind gray (`zinc`, `slate`, `neutral`) as text or background. Forbidden: black `#000` as ink. Forbidden: using green for anything that is not success / live / primary CTA.

Tint rotation on cards: honey → sage → green → clay. Do not make every card green.

---

## 6. Type

| Role | Face | Weight | Notes |
|---|---|---|---|
| Display / H1–H3 | **Young Serif** | 400 only | Never bold the serif. Tracking tight on H1. Line-height ~1.18 |
| Body, UI, buttons | **Nunito Sans** | 400 / 600 / 700 / 800 | Buttons are bold (700–800). Body 400. Line-height 1.7 |
| URLs, counts, code | Nunito Sans, tabular / slightly smaller | 600 | The console URL is mono-*feeling*, not a new font |

Do not add a third family on marketing. Docs may add **JetBrains Mono** for code.

Scale (landing):

| Role | Size |
|---|---|
| Hero name | `clamp(3rem, 7vw, 5rem)` |
| Hero rest | `clamp(1.5rem, 3vw, 2.3rem)` |
| Section title | `clamp(1.7rem, 3.4vw, 2.4rem)` |
| Card title | `~1.18rem` |
| Body | `1.02–1.08rem` |
| Aside / whisper | `~0.92rem`, `honey-deep`, bold |
| Eyebrow pill | `0.78–0.8rem`, uppercase, tracking `0.04em`, bold |

Headlines are sentence case, not Title Case, except product name and short labels (Decks, Docs).

---

## 7. Shape, space, elevation

We used to be pill-round (`999px`, `24px` cards) in the HTML prototype. Production is **soft rectangles** — modern stationery, not a lozenge factory.

| Token | Value | On |
|---|---|---|
| `radius-chip` | `8px` | Status, eyebrows, tiny tags |
| `radius-control` | `10px` | Buttons, inputs, stickers, junk pills |
| `radius-card` | `16px` | Cards, console |
| `radius-panel` | `20px` | Feature bands, final CTA |

| Token | Value | On |
|---|---|---|
| `shadow-soft` | `0 8px 24px rgba(34, 59, 51, 0.07)` | Resting cards |
| `shadow-lift` | `0 18px 48px rgba(34, 59, 51, 0.11)` | Hover, console |

Surfaces lift `3px` on hover (`surface-lift`). Buttons lift `2px`. Never a hard drop-shadow or glow halo except the live-console green ring.

**Wrap:** `width: 80%` on desktop (`max-width: 80%`), full width under 720px, inline padding `24px`. Prose measure: `640px`. Section vertical rhythm: `pt-5 / pb-22`. **Sections carry no background of their own** — not a wash, not a tint, not a colour band. The shader is the only background on the page; a section that paints its own scrolls against a fixed backdrop and shows as a seam. Closing CTAs are copy on paper with a green button, not a filled panel. Separate blocks with space, not rules — a hairline across a continuous background reads as a scar. Marketing sections do **not** use eyebrow/Pill labels.

Focus: `3px solid honey`, offset `3px`. Selection: honey-tint on ink.

---

## 8. Motion

Motion is encouragement, not spectacle. Things *settle onto paper* and *turn green when done*.

- Ease out: `cubic-bezier(0.22, 1, 0.36, 1)`
- Spring (pops, live badge): `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Scroll reveal: fade + 18px up, 0.55s, stagger children 45ms
- Hero: rise in ~0.9s; swash underlines from the left; letterpress stamp settles
- Console: tiles idle → honey working → green done → confetti + live pulse
- Reduced motion: **all of it off**. Content visible without JS (`js` class gate)
- Motion is GSAP, registered once in `src/lib/motion.ts`. New tweens go inside `gsap.matchMedia()` — the CSS reduced-motion kill-switch has no power over inline styles. See `MOTION.md` §9 for what stays CSS and why

Do not add bounce-on-every-card, typewriter heroes, or looped gradient text.

---

## 9. Mark & logo

Source: `public/logo_base.svg`. Render through `Logo` — do not inline a second SVG.

- Header: mark `36px` + wordmark `allr` in Young Serif
- Hero: oversized letterpress stamp, rotated `-12deg`, three layers (shadow SE, ink multiply, highlight NW), masked so it dies into the copy
- Never recolor the mark to green, never put it in a squircle app-icon on marketing (the PWA icons in `/public` are for install chrome only)
- Clear space: at least a quarter of the mark’s width

OG image: `public/og.png`. Bump `?v=` in `layout.tsx` when it changes.

---

## 10. Components (use these, don’t restyle them)

| Component | File | Job |
|---|---|---|
| `Button` | `ui/Button.tsx` | `green` primary, `ghost` secondary, `white` on green bands. Omit `href` for a status badge (“Coming soon”) |
| `Card` | `ui/Card.tsx` | Sticker + tint + title + body + optional ready/live pill |
| `Pill` | `ui/Pill.tsx` | Section eyebrows. Tones: neutral / green / honey |
| `JunkPill` / `OnePill` | `ui/JunkPill.tsx` | The stack we replace vs the one plan |
| `SectionHead` | `ui/SectionHead.tsx` | Eyebrow + serif title + optional sub |
| `Logo` | `ui/Logo.tsx` | The mark |
| `Reveal` | `Reveal.tsx` | Scroll entrance |
| `LaunchConsole` | `LaunchConsole.tsx` | Signature product demo. One per page, hero only |
| `AmbientShader` | `AmbientShader.tsx` | Site-wide atmosphere, one fullscreen fragment shader (see `MOTION.md` §5.5) |

New UI belongs in `src/components/ui/` and must use existing tokens. If a new component needs a new color, the vocabulary is wrong — change this file first, not the component.

---

## 11. Page rhythm (a marketing page)

A welcome page reads like a short essay with objects on the desk, not a SaaS feature grid. Each section retires one doubt; order is the argument (see `LANDING_PAGE_STORY.md` §5).

1. **Hero** — category + outcome + Get Started; one workspace beat (`WORKSPACE_DEMO`)
2. **Gap** — generated output is not a product (paradox, tax, token trap)
3. **Provide** (`#provide`) — interactive mark: six petal beats (three harnesses + three audience reflections); Outcomes chapter absorbed here
4. **Loop** (`#loop`) — Ideate → Create → Deploy → Operate → Maintain → Scale
5. **Contrast** — why not chat / builders / raw cloud (`CONTRAST`)
6. **Platform progress** (`#progress`) — honest Available / In progress / Upcoming
7. **Access** (`#access`) — web · desktop · mobile in one chapter; phone vignette subordinated (not a peer section)
8. **Resolve** — quiet promise (one line) · FAQ · Final CTA. Promise is demoted into Resolve — not a competing mid-page band.

**Roadmap** lives at `/roadmap`. Named proof / testimonials stay **hidden**. No public early-access waitlist on the marketing door. Homepage copy imports from `brand.ts` only — do not lead with `VALUE_BEATS` or `OUTCOMES`.

---

## 12. Imagery & illustration

- Paper, lamplight, letterpress, soft orbs
- **No grain, and no paper texture.** The page wants clear, smooth visuals. The atmosphere is a single fragment shader (`MOTION.md` §5.5) and the only thing applied on top of it is a sub-perceptual dither that stops wide gradients banding. Do not re-add a noise or fibre layer
- The console *is* the product shot — artifact stills from `public/visuals/`, motion in `MOTION.md`
- Emoji stickers are a fallback when a still is not available; make-cards use photographed artifacts
- No 3D robots, no neon grids, no purple-blue AI gradients, no screenshot of a terminal on the homepage
- Photography, if any: warm, daylight-end, people making things — not stock handshakes

---

## 13. Surfaces: what inherits this

| Surface | How far |
|---|---|
| `allr.github.io` landing | Full. Source of truth |
| Campaign / waitlist / OG | Full |
| `allr-agent/website` docs | **One Allr.** Same faces, hues, and paper wash as the landing — migrate off the dark-navy theme. Layout may be denser; code may use JetBrains Mono. Never GitHub gray |
| `/login` | Full. It is still a welcome surface: the shader, the wordmark, the paper wash |
| `/account` (the signed-in shell) | Same hues, wordmark, faces and type scale. **No shader** — flat paper. Sidebar chrome instead of the marketing page rhythm; controls are denser and forms carry visible labels. What it shows is decided by the early-access state, not by the route |
| Helix admin | Product chrome; do not force letterpress. Steal tokens, not the landing layout |
| TUI / desktop app | Out of scope for this vocabulary |

---

## 14. How to add a new marketing page

1. Read this file and open `/design`
2. Import copy from `src/lib/brand.ts` — do not rewrite the tagline
3. Use `Header` / `Footer` / `AmbientBackground` unless the page is a legal stub
4. Use `SectionHead`, `Card`, `Button`, `Pill` before inventing a block
5. Wrap is `1080px`. Prose is `640px`. Headings are Young Serif 400
6. Primary CTA is green. Secondary is ghost. Status (coming soon) has no `href`
7. Check mobile and `prefers-reduced-motion`
8. If you needed a new color, font, radius, or slogan — stop and update this file first

---

## 15. File map

| Path | What |
|---|---|
| `DESIGN.md` | This contract |
| `/design` | Living spec (noindex) |
| `src/lib/brand.ts` | Locked copy |
| `src/lib/site.ts` | Canonical URL + re-exports |
| `src/app/globals.css` | Tokens, atmosphere, motion |
| `src/components/ui/` | Primitives |
| `src/components/app/` | The `/app` page sections. Its hero shows real captures (`public/*_screenshot.png`); the drawn screens in `mocks.tsx` are the kept fallback |
| `src/lib/releases.ts` | The latest desktop release — the only source of download links |
| `src/lib/legal.ts` | Terms/Privacy versions and the contact address. The stored consent and the rendered page read the same constants |
| `src/lib/age.ts` | The 18+ gate. Imports nothing, so it can be tested on its own — `tests/age.test.mjs` |
| `src/lib/firebase/env.ts` | Firebase config with **no** Firebase import, so `waitlist.ts` can read it without dragging the SDK onto the homepage |
| `src/lib/firebase/` | The SDK, Google sign-in, and the `users/{uid}` profile. Only `/login` and `/account` may import from here |
| `src/components/account/` | The signed-in shell, its gate, and registration |
| `firebase/firestore.rules` | The whole security boundary — there is no server. Tested by `firebase/*.test.mjs` |
| `scripts/check-bundle-isolation.mjs` | Proves the marketing pages still ship without the Firebase SDK |
| `public/docs/` | The built docs, copied in from `allr-agent/website` by `scripts/sync-docs.mjs`. Generated — never hand-edit a page here |
| `vercel.json` | Host routing on allr.work: `/release` sends people to GitHub Releases |
| `MOTION.md` | Homepage motion & stills contract |
| `public/visuals/` | Editorial stills (desk, six artifacts) |
| `public/logo_base.svg` | Mark |
| `public/og.png` | Share image |

---

## 16. Locked decisions

Answered while this vocabulary was written. Do not reopen on a later page.

| Decision | Call | Implication |
|---|---|---|
| Docs atmosphere | **One Allr: paper** | `allr-agent/website` defaults to the landing paper wash. Same faces and hues. Dark is opt-in pine, never navy. Denser layout is fine |
| Primary CTA | **Get Started → `/login/`** | Public door is account signup. Early access waitlist is off the marketing hero/header/footer for this pass. Install stays on `/download` / Access / `/app` |
| `/design` visibility | **URL only** | Noindex. No footer link. Team and agents open `/design` directly |
| The app page | **`/app`, in the nav** | Ported from the primary-website `/client` page and rewritten into this voice. Copy lives in `APP` in `src/lib/brand.ts`. `/download` stays as its own page; both read the same release data |
| Where a download button goes | **`/download`, always** | Only `/download` links at a release asset. Download buttons on `/app` and Access navigate there first. The homepage hero uses Get Started → `/login/`, not Download |
| Download links | **`app_configuration` in Firestore, GitHub Releases as the fallback** | Versions and per-platform links live in `app_configuration`, so a bad release can be rolled back by pointing `currentVersion` at an older version document — something the GitHub Releases API cannot do, because it only ever knows what is latest. `src/lib/releases.ts` stays as the fallback: with the collection empty or unreachable, `/download` and `/app` keep working from GitHub rather than showing an empty page. This replaces the earlier call that GitHub Releases was the only source |
| Client and workspace price separately | **The app is free, the workspace is the plan** | Downloading Allr — desktop or mobile — is free and stays free; the download button says "beta · free forever". The agent workspace it connects to is a separate product with its own pricing, which is what `PRICING` in `src/lib/brand.ts` describes. A line about one is never a line about the other: do not let pricing copy imply the app costs money, or a download page imply the workspace is free |
| Two lists, never one | **Early access and the mobile beta are separate** | `waitlist` holds the general early-access list (`/#early-access`); `beta_signups` holds the mobile closed beta (`/app#get`) and carries a `platform` field. Separate so someone already on the early-access list can still join the beta — both use the email hash as the document id, so one shared collection would refuse the second signup. The lists are declared once in `src/lib/waitlist.ts`; a page never names a collection |
| Which mobile platform | **The device answers, the person can override** | The beta chips start on the neutral "Either" — which is also what the server renders — and `detectMobilePlatform()` in `src/lib/waitlist.ts` moves them to Android or iOS on mount. Never default to the first chip: that filed every iPhone under Android. **iOS covers iPad and Android covers Android tablets** — a tablet runs the same build as the phone, so the beta does not track them apart and there is no tablet field |
| Where a signup goes | **The ask decides the list** | Anything phone- or tablet-shaped routes to `/app#get` — the `/download` "On your phone" card and the homepage "On your phone" section included. Everything else routes to `/#early-access`. The one exception is the homepage hero's phone-glyph pill, which is the general list by design (§3) |
| Where writes go | **Firestore, through a privileged API for accounts and straight from the browser for the waitlist** | The site is served from Vercel and has a real server, so `output: "export"` is gone and `src/app/api/**` route handlers run for real. Account writes go through them with the Firebase Admin SDK, which is what lets the server enforce one account per email address and keep the workspace and trial fields out of the user's reach. The waitlist keeps its create-only browser write: it needs no identity and the rules already hold it. `firebase/firestore.rules` remains the boundary for everything the browser touches — it is no longer the *only* boundary. This replaces the earlier call that there was no server to post to |
| Where the docs live | **Written in `allr-agent`, shipped from `public/docs`** | The Docusaurus source stays in the product repo (`website/`, `baseUrl: '/docs/'`); its finished build is copied into `public/docs` by `pnpm sync-docs` and committed, so allr.work serves the docs from this one deployment with no proxy or second host. The cost is that the snapshot is only as fresh as the last sync: after a docs change, re-run the sync and commit. Never edit a page under `public/docs` — the edit belongs upstream and the next sync would overwrite it. `/llms.txt` and `/llms-full.txt` are copied to the site root the same way |
| `/release` | **A redirect, not a page** | `allr.work/release` sends visitors to the GitHub Releases page for `allr-ajmx/allr-agent`; `/release/latest` to the latest one. A temporary redirect, so the destination can move. Marketing download buttons still go to `/download` — this is the raw-artifact door for links shared in issues and chat |
| Sign-in | **Google only, and the server creates the account** | One provider, no password, no magic link, no second button — one identity per person, and an email address Google has verified. There is no self-serve path to an account: the browser cannot write `users/{uid}` at all, the rules refuse it, and `POST /api/account/register` is the only thing that creates a profile. It re-checks every field, rejects a token whose `sign_in_provider` is not `google.com`, and claims the email address in the same transaction so a second account for one person cannot exist. `signInWithPopup`, never `signInWithRedirect` — the redirect flow needs third-party storage on the `authDomain`, which browsers now partition |
| The signed-in shell | **`/account`, sidebar, no shader** | `/login` keeps `AmbientShader`, because it is still a welcome surface. `/account` does not: the shader is one fixed full-viewport WebGL canvas and behind a dense, card-heavy dashboard it fights the content and holds a GPU context on every navigation. `/account` is flat `bg-paper` with a left rail. Everything else is inherited — same hues, same wordmark, same two faces, `Reveal` and nothing louder. Neither route is indexed and neither is in the sitemap, the same treatment `/design` gets; the only public door is a plain "Sign in" text link in the header, which never displaces the green "Get early access" button |
| Age and legal data | **18+, asked at registration** | Allr is strictly an above-contract-age product. Date of birth is asked in the first-time registration form, not at checkout, and an under-18 answer is refused twice: by the form and again by the Firestore rules, so a forged client gets nowhere. The date is stored, because the stored date is the evidence the age assertion rests on. Registration otherwise collects only the legal minimum needed to sell to someone later — legal name and country of residence. Accounts are **individual only**; there is no business signup. Residents of the **EU and the UK are not offered accounts**: those countries are left out of `src/lib/countries.ts`, which the server validates against, so the Privacy Policy's statement that Allr is not directed at them stays true. **Postal address and tax ID are deliberately deferred to checkout** and are never asked at signup. Terms and Privacy are two separate ticks and the marketing opt-in is a third, unticked one: bundling consent is exactly what makes it invalid |
| An account and early access are two things | **Sign up, then ask** | An Allr account is for anybody who wants one: it holds who you are, and making one puts you in no queue. Early access is a separate act with its own button on the first page after signup, because a queue you did not know you joined cannot be described to you honestly. Which phone you test on is asked *there*, not at signup — it only means something once you are asking, since early access enrols people in mobile testing. Asking twice keeps the original timestamp, so a double-click never moves somebody to the back of a queue ordered by when they asked. The three workspace fields — `workspace_username`, `workspace_email`, `workspace_address` — are the approval; all three set and nothing else. Approval starts a one-week promotional trial carrying $5 of AI credit, and when it ends the workspace asks to be paid for. Every state is *derived* from the document on read, never stored, so it cannot go stale |
| An address belongs to a person, not a uid | **A stranded account comes back** | Profiles are keyed by Firebase uid and addresses are claimed separately, which left a trap: delete the Firebase account, sign in again with the same Google address, and the new uid has no profile — so you are shown the signup form — while the claim still names the old uid, so signing up is refused as a duplicate. Locked out of an account that plainly exists. So a claim naming a uid Auth no longer knows is stale, and the profile moves to whoever proves control of that verified address. A claim whose uid still exists is never touched: that is somebody else's account, and refusing is right |

## 17. Still open

1. **Helix chrome.** How much of this vocabulary should the Helix dashboard inherit versus remaining a product UI?

