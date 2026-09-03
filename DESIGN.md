# Allr design vocabulary

This is the contract for every public Allr surface that a person *arrives* at — landing pages, campaigns, waitlists, launch emails, OG images. The living spec is **`/design`**. Tokens live in `src/app/globals.css`. Locked copy lives in `src/lib/brand.ts`.

Read this before changing copy, color, type, layout, or a component. Do not invent a second Allr.

The HTML prototype in `references/index.html` is historical. The Next app is canonical (tighter radii, letterpress hero, launch console tiles). If they disagree, the Next app wins — then this file is updated.

---

## 1. Product, in one breath

Allr is one AI workspace that takes an idea in plain language and returns **finished work**, then **publishes it**.

Not a chatbot. Not a coding copilot. Not six tools with a shared login.

You describe the thing. Allr makes the thing. You share a link.

The name is the thesis: **allr, as in all.**

---

## 2. Who we speak to

People with something to ship, who are tired of paying a stack of AI subscriptions and still not shipping.

| Audience | What they need from us |
|---|---|
| Creators | Site, promo, press kit, in front of an audience |

On the homepage the audiences are not cards. The hero workspace shows one thing being made per tab (`SHOWCASE` in `brand.ts`) — a visitor picks the kind of work that is theirs and watches it get made and go live.
| Founders & solopreneurs | Deck, model, landing page, demo — one plan |
| Students & educators | Presentations and papers, not formatting battles |
| Small teams | One place, one share link |

We do **not** lead with developers, self-hosters, or “autonomous agents.” That product is real (CLI, gateway, skills, Helix). It is how Allr works, not why a visitor cares. Power-user language belongs in docs, not on the door.

---

## 2b. The Bloom — the mark turns to the work

The mark has six petals. On the homepage each petal carries one *example* of finished work and lends it a colour. This is a way of showing, not a catalogue: never write "six things", never imply the list is complete or that everything on it ships at launch. The mark turns to whatever is being made; the six below are the ones we show today.

| Petal | Colour | Thing |
|---|---|---|
| 0 | `#74926b` sage | Sites |
| 1 | `#f7c14c` honey | Decks |
| 2 | `#e6981a` amber | Sheets |
| 3 | `#f8dc8d` pale gold | Docs |
| 4 | `#34905e` deep green | Video |
| 5 | `#9bb289` light sage | Apps |

Rules: a petal shape (`PetalShape`) is the only decorative form we own — use it for bullets, numerals, backdrops and progress. Never add a seventh colour. When a surface is "about" one thing, it takes that petal's colour and the mark lights that petal (`AllrMark highlight`). Do not number petals in copy ("petal 3 of 6"). Registry: `src/lib/petals.ts`.

## 3. Voice

**Mentor, not vendor.** Warm, not cute. Finished, not generating.

Speak as if you are sitting next to someone at a kitchen table at the end of the day — paper, lamplight, a thing finally done. Short sentences. Concrete nouns (deck, link, formula). Second person: *you*.

The only first-person line we own is the promise:

> You bring the idea. We’ll take care of everything between you and ‘it’s live.’

### How it sounds

| Do | Don’t |
|---|---|
| “Your site is up.” | “We’ve leveraged our agentic pipeline to orchestrate a deploy.” |
| “Ready to present.” | “AI-powered presentation generation.” |
| “One subscription.” | “A unified ecosystem of capabilities.” |
| “Describe it.” | “Prompt the model.” |
| “Live.” | “Output artifact.” |

Prefer the words in `SAY` (`src/lib/brand.ts`). Never use the words in `NEVER_SAY`. If a sentence would also fit a YC launch post, rewrite it.

### Name casing

| Form | Where |
|---|---|
| `allr` | Wordmark next to the mark (Young Serif, lowercase) |
| `Allr` | Sentences, titles, metadata |
| `allr — as in all.` | Footer, quiet brand moments |
| Never `ALLR` | — |
| Never `AllR` | — |

### Calls to action (2026-08-25)

The hero shows two: **Download** (dark pill, macOS · Windows · Linux glyphs) → `/download`, and **Get early access** (light pill, phone glyph) → the waitlist. Desktop gets the app; phones get on the list. `/download` links only real assets from the current GitHub release (`src/lib/releases.ts`) — no other links.

---

## 4. Locked phrases

Do not paraphrase these on a page. Import from `src/lib/brand.ts` or copy exactly.

| Role | Line |
|---|---|
| Tagline | the one subscription that replaces all of them |
| Eyebrow | One workspace. Finished work. |
| Hero headline | the one subscription that replaces all of them. (the mark + `allr` wordmark sit above it as the name) |
| Subhead | One AI workspace that makes finished work — decks, docs, videos, websites, apps, and games. |
| Loop | Describe it. / Allr makes it. / Ship it. |
| Promise | You bring the idea. We’ll take care of everything between you and ‘it’s live.’ |
| Closing | Stop stitching. Start shipping. |
| Etymology | allr — as in all. |
| Reassurance | No credit card required. Your first project is on us. |

**Six outputs, in this order:** Decks · Docs · Spreadsheets · Videos & animations · Websites · Apps & games.

Websites and apps are *live*. The rest are *ready*. That distinction is the product: files you can present, and things that have a URL.

---

## 5. Color

Color is semantic, not decorative. Green means done. Honey means warmth and in-progress. Ink is pine, not black.

| Token | Hex | Meaning | Use |
|---|---|---|---|
| `paper` | `#FBF8F2` | Evening paper | Page wash, sticky header |
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

Ambient orbs are honey + green on paper. Never introduce a fourth hue (blue, purple, neon) on a welcome surface.

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

**Wrap:** `max-width: 1080px`, inline padding `24px`. Prose measure: `640px`. Section vertical rhythm: `pt-5 / pb-22`. **Sections carry no background of their own** — not a wash, not a tint, not a colour band. The shader is the only background on the page; a section that paints its own scrolls against a fixed backdrop and shows as a seam. Closing CTAs are copy on paper with a green button, not a filled panel. Separate blocks with space, not rules — a hairline across a continuous background reads as a scar.

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

A welcome page reads like a short essay with objects on the desk, not a SaaS feature grid.

1. **Hero** — name, tagline, one sentence, two CTAs, launch console
2. **Problem** — the subscription tax
3. **Solution** — one workspace; technical stuff already handled
4. **What it makes** — the six outputs
5. **How** — three steps
6. **Publishing** — the thing other tools drop at the download button
7. **Promise** — one line, centered, serif
8. **Who** — four audiences
9. **Pricing** — the arithmetic, not a toggle
10. **Final CTA** — green band, one action

Campaign pages may cut sections. They may not reorder the six outputs, swap the promise, or skip the paper atmosphere.

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
| Allr.OS Dex / dashboard login | Same hues and wordmark. Controls may be denser |
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
| Primary CTA | **Waitlist / early access form** | Keep the line “Get early access.” When “Coming soon” is retired, primary goes to a waitlist form — not install, not docs. Install stays a secondary path |
| `/design` visibility | **URL only** | Noindex. No footer link. Team and agents open `/design` directly |
| The app page | **`/app`, in the nav** | Ported from the primary-website `/client` page and rewritten into this voice. Copy lives in `APP` in `src/lib/brand.ts`. `/download` stays as its own page; both read the same release data |
| Where a download button goes | **`/download`, always** | Only `/download` links at a release asset. Every download button elsewhere — the homepage hero, both on `/app` — navigates there first, so the formats, sizes and requirements are read before anything is fetched |
| Download links | **Live from GitHub Releases** | `src/lib/releases.ts` is the only source. Fetched at build time so the static export works with no JS, re-fetched on mount so a new release reaches visitors before the next site build. Targets the `Allr_*` full bundles. Never hand-write a version or an asset URL |
| Client and workspace price separately | **The app is free, the workspace is the plan** | Downloading Allr — desktop or mobile — is free and stays free; the download button says "beta · free forever". The agent workspace it connects to is a separate product with its own pricing, which is what `PRICING` in `src/lib/brand.ts` describes. A line about one is never a line about the other: do not let pricing copy imply the app costs money, or a download page imply the workspace is free |
| Two lists, never one | **Early access and the mobile beta are separate** | `waitlist` holds the general early-access list (`/#early-access`); `beta_signups` holds the mobile closed beta (`/app#get`) and carries a `platform` field. Separate so someone already on the early-access list can still join the beta — both use the email hash as the document id, so one shared collection would refuse the second signup. The lists are declared once in `src/lib/waitlist.ts`; a page never names a collection |
| Which mobile platform | **The device answers, the person can override** | The beta chips start on the neutral "Either" — which is also what the server renders — and `detectMobilePlatform()` in `src/lib/waitlist.ts` moves them to Android or iOS on mount. Never default to the first chip: that filed every iPhone under Android. **iOS covers iPad and Android covers Android tablets** — a tablet runs the same build as the phone, so the beta does not track them apart and there is no tablet field |
| Where a signup goes | **The ask decides the list** | Anything phone- or tablet-shaped routes to `/app#get` — the `/download` "On your phone" card and the homepage "On your phone" section included. Everything else routes to `/#early-access`. The one exception is the homepage hero's phone-glyph pill, which is the general list by design (§3) |
| Waitlist backend | **Firestore, create-only, straight from the browser** | The site is a static export, so there is no server to post to. `src/lib/waitlist.ts` is the only transport; the rules in `firebase/firestore.rules` are the whole security boundary and are deployed by CI, not pasted into a console. A production build with no backend configured fails rather than shipping a form that pretends to have saved an address |
| Where the docs live | **Written in `allr-agent`, shipped from `public/docs`** | The Docusaurus source stays in the product repo (`website/`, `baseUrl: '/docs/'`); its finished build is copied into `public/docs` by `pnpm sync-docs` and committed, so allr.work serves the docs from this one deployment with no proxy or second host. The cost is that the snapshot is only as fresh as the last sync: after a docs change, re-run the sync and commit. Never edit a page under `public/docs` — the edit belongs upstream and the next sync would overwrite it. `/llms.txt` and `/llms-full.txt` are copied to the site root the same way |
| `/release` | **A redirect, not a page** | `allr.work/release` sends visitors to the GitHub Releases page for `allr-ajmx/allr-agent`; `/release/latest` to the latest one. A temporary redirect, so the destination can move. Marketing download buttons still go to `/download` — this is the raw-artifact door for links shared in issues and chat |

## 17. Still open

1. **Helix chrome.** How much of this vocabulary should the Helix dashboard inherit versus remaining a product UI?

