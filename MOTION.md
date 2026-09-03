# Allr homepage motion & visuals

Production spec for the GitHub Pages landing (`allr.github.io`). Pair with `DESIGN.md` (voice, color, type). This file is the contract for **what moves, how, and what it looks like**.

If a motion is not listed here, it does not ship. If a still is not in `public/visuals/`, do not invent a new one on the page.

---

## 1. Intent

The homepage has one visual sentence:

> Work lands on paper. It turns green. Then it gets a link.

Visitors should feel they are watching a **desk at the end of the day**, not a product demo of software chrome. Artifacts are photographed objects (letterpress, laid paper, lamplight). UI chrome (URL, Live, labels, waitlist) is HTML, because generated pictures cannot be trusted with “Allr” or `allr.app/your-launch`.

Four verbs. Nothing else.

| Verb | Means | Feel |
|------|--------|------|
| **Settle** | It arrived on the desk | Slow, heavy, paper dropping into place |
| **Ink** | It is being made | Honey lamplight, a held breath, no spinner-as-toy |
| **Live** | Someone else can see it | Green, a small lift, a pulse that dies down |
| **Glow** | It is live | The live thing itself gets a green border and a soft halo that swells in, then keeps breathing slowly (4.5s) — the one loop on the page, because live is an ongoing state |

Professional display bar: these motions must read on a **27" monitor, a phone, and a conference projector**. No 4px fidgets. No emoji-as-the-picture. No “AI particles.”

---

## 2. Timing constants

Named so every sequence can share a clock.

| Token | Value | Use |
|-------|--------|-----|
| `--ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | Settle, fades, lifts |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Live badge pop only |
| `--ease-ink` | `cubic-bezier(0.45, 0, 0.2, 1)` | Honey wash filling a still |
| `STEP` | `880ms` | One artifact in the console sequence |
| `SETTLE` | `700ms` | Card / still entering |
| `INK` | `640ms` | Idle → working wash |
| `LIVE` | `480ms` | Working → done + green ring |
| `STAGGER` | `70ms` | Neighbours in a row |
| `PULSE` | `2.4s` | Live dot (2 cycles then rest) |

Never run more than **one verb at a time** on one object. A still settles, *then* inks, *then* goes live.

`prefers-reduced-motion: reduce` — jump to the **Live / done** frame. No looping pulses. Reveals are instant opacity 1.

---

## 3. Visual system

> **Retired (2026-08-24):** the photographed stills in `public/visuals/` are no longer used anywhere. Artifacts are drawn UI mocks (§5.1). The section below is kept for history only.

### 3.0 Stills (historical)

Assets live in `public/visuals/`. They are editorial stills, not icons.

### 3.1 Style lock

All stills share one room:

- Support: warm laid paper (`#FBF8F2` family), visible fibre
- Light: one brass desk lamp from upper-left, honey highlight, pine shadow
- Objects: letterpress boards, folios, ledgers, film windows — tactile, slightly used
- No people, no laptops, no terminals, no neon, no readable brand wordmarks
- Grain like a 120mm scan. Quiet, catalog-quality, not CGI gloss

The **style master** is `public/visuals/style-master.jpg`. Every other still is derived from that light and paper. Do not generate a seventh look.

### 3.2 Artifact stills

| File | Object | Camera | What “done” looks like in motion (CSS, not a second file) |
|------|--------|--------|----------------------------------------------------------|
| `artifact-deck.jpg` | Fanned stack of cream presentation boards, foil corner | ¾ overhead, 4:3 | Green hairline around the stack, slight lift |
| `artifact-doc.jpg` | Thick folio with a sage ribbon, pages just open | ¾, 4:3 | Ribbon reads greener, shadow tightens |
| `artifact-sheet.jpg` | Open ledger, honey-ruled columns, figures out of focus | Straight down-ish, 4:3 | A green tick in the corner chip (HTML) |
| `artifact-video.jpg` | Paper film window / small projection card | Landscape in a 4:3 mat | Honey bar under the window fills, then holds |
| `artifact-site.jpg` | Letterpress window-card, empty pane (URL is HTML) | Front ¾, 4:3 | Green live ring on the HTML chrome above it |
| `artifact-app.jpg` | Small tactile board / windowed paper toy | ¾, 4:3 | Same green lift as deck |

### 3.3 Ensemble

| File | Use |
|------|-----|
| `desk-ensemble.jpg` | Publishing band. All six objects on **one** desk, one lamp. Proves “one body of work.” 16:9. |

### 3.4 How stills are displayed

A still is never a raw `<img>` dumped in a grid.

1. Paper mat: `border-radius: 12px` (between chip and card), 1.5px `line` border
2. Inner photo: `object-fit: cover`, slight `saturate(0.94)` at rest
3. Soft contact shadow: `0 10px 28px rgba(34,59,51,.12)` — like the object sits on the card
4. State overlays are CSS (see §4), not extra image files
5. Exact words (Deck, Live, URL) sit **beside or below** the still in Nunito/Young Serif

On a projector the still must remain recognizable at ~180px wide (console tile) and beautiful at ~420px (make-cards).

---

## 4. State machine (every artifact)

```
idle ──INK──► working ──LIVE──► done
                  │
                  └── (console only) next sibling starts INK
```

| State | Still | Frame | Motion |
|-------|-------|-------|--------|
| **idle** | Full colour, 8% darker, no ring | Resting on the desk | None |
| **working** | Honey vignette from upper-left (lamp), 6% brighter | 640ms wash | A slow 8px light sweep, once, `--ease-ink`. No circular spinner on the photo. A 2px honey bar under the still travels 0→100% once. |
| **done** | Full colour, green 1.5px ring, 2px lift | 480ms | `translateY(-2px)`, ring fades in, check chip pops with `--ease-spring` |

Working must **not** look like a loading spinner. It looks like the lamp coming on over the object.

---

## 5. Sequences by homepage section

### 5.1 Hero — The Workspace (`M-WORKSPACE`)

The signature. One Allr window: the ask on the left, the thing it made on the right. Tabs (Decks · Docs · Sheets · Video · Sites · Apps) switch what is being made, with a one-line caption beside them. Plays once on scroll-in; each tab is a deliberate replay.

**Stage** — all HTML (`Workspace.tsx`, `mocks/Mocks.tsx`). No photographs anywhere on the page: every artifact is a drawn UI — a slide, a page, a grid, a player, a site, a phone — sized from its container so the same mock is crisp at 120px and 700px.

| t | What |
|---|------|
| 0 | Ask bubble present. Step 1 ticks. Artifact pane is dashed honey with a 3px ink bar travelling 0→100% (1150ms). Status: *Making your deck…* |
| 1150ms | Artifact **Settles** in (10px rise + fade). Steps 2–3 tick. |
| 1470ms | **Glow**. The artifact's border turns green with a halo that breathes in once. Window border `green-line`. The deploy line along the top edge (honey while making) completes and turns green, then fades. The URL dot goes green and emits two rings. *It's live.* with a checkmark that draws itself. |

**Reduced motion:** artifact visible with the resting glow (no breathing), no line, no rings.

### 5.1a The header mark

The mark in the header turns and lights a petal to follow the section under the
middle of the screen. **This happens on the landing page only.** It is tracking
the Bloom, and on a page with no Bloom a logo that turns as you scroll is just
a logo that will not sit still — `/app` sets `data-petal` on four of its
sections and would otherwise drive it. `Header.tsx` gates the whole behaviour
on `usePathname() === "/"`.

### 5.1b The mark (`M-BLOOM`)

The hero mark is inline SVG (`AllrMark.tsx`). On load its six petals bloom in order (scale 0 → 1.22 → 1, 100ms stagger) — the loader's intro from the logo package, ported to CSS on the light brand. Plays once; nowhere else does the mark move.

### 5.1c Scroll (`M-SCROLL`)

Two scroll behaviours, both transform-only and both off under reduced motion:

- **Parallax** (`motion/Parallax.tsx`) — a scrubbed ScrollTrigger drifts an element a fraction of the distance it scrolls, relative to the viewport centre. Positive `speed` = further away (slower), negative = nearer (faster). Used on: hero mark (0.22), hero window (−0.05), the Versions panel (0.1), the two phones (0.16 / −0.06 / 0.12). Offsets are clamped; the trigger watches a static wrapper, never the moving element.
- **Reveal variants** — `blur` for section headlines (come into focus: blur 10px → 0, 0.9s) and `wipe` for the promise (mask sweeps left→right like ink being laid down, 1.1s). Everything else keeps `up`/`scale`.

### 5.1d How it works — scrollytelling (`M-STORY`)

On large screens the three steps scroll on the left while one stage stays sticky on the right. A band across the middle of the viewport decides the active step; the stage moves through the same three beats as the hero: ask → the site settles in → the site glows green + live URL with `v1 · Live`. Inactive steps sit at 45% opacity. Below `lg` each step carries its own inline stage.

### 5.1e On your phone (`M-PHONE`)

Three drawn phones. Front: the Allr chat with an ask, the reply, the artifact card with its live link, Share/Open. Left, tilted −6°, further away: the lock screen with an Allr notification. Right, tilted +6°: the Projects list, every project with its live dot. No third-party messaging surfaces are shown. Nothing loops.

### 5.2 What Allr makes — the Bloom (`M-BLOOM`)

The identity system. The mark has six petals; on the homepage each carries one example of finished work (`src/lib/petals.ts`): Sites · Decks · Sheets · Docs · Video · Apps, in petal order, 60° apart. Examples, not a catalogue — copy never counts them. Every accent colour on the page is a petal colour.

**Stage** — a large mark pinned on the left; six panels on the right, one per petal, each with its title, body and the artifact mock sitting on a big petal shape in its colour.

**Motion** — scroll-driven, not timed. The gear's rotation is interpolated from how far the middle of the screen is through the panels, so it turns exactly as far as you scroll and settles with the active petal pointing at its panel. The active petal is lit (the other five recede to 22%), its colour washes the section edges and the halo behind the gear, and the active artifact carries the live glow. The header mark and the workspace title-bar mark turn and light the same way. Reduced motion: the gear snaps petal to petal. Below `lg` each panel carries its own small mark.

### 5.2b Legacy cards (`M-CARDS`, retired)

Six cards. Each has the matching **mock** (`MockFrame`) at 16:10 on top, then title + body + ready/live pill.

**Timeline per card** (stagger `i × 70ms` after the card’s reveal)

| t | What |
|---|------|
| 0 | Card settles 18px up → 0 |
| 120ms | Still INK (honey sweep once) |
| 120 + INK | Still LIVE (green ring). Ready pill honey→green with the existing shimmer |

Cards do **not** wait for the console. They play when they enter view, independently. On a projector this reads as a row of objects being “stamped done.”

### 5.3 How it works (`M-LOOP`)

Three steps. Each card owns a miniature of the verb.

| Step | Visual | Motion on reveal |
|------|--------|------------------|
| 1 Describe it. | A single caption chip with the quote | Chip settles; no typewriter. The quote is already complete. |
| 2 Allr makes it. | Three tiny stills (deck, doc, site) in a row | They INK then LIVE in order, 220ms apart — a 1.2s echo of the console |
| 3 Ship it. | URL chip `allr.app/your-launch` | Pip honey→green, Live label springs, pulse twice |

### 5.4 It's live — the hosting scene (`M-HOSTED`)

One direction, left to right. The scene fills the section; the copy sits on top of its left half, and the web is masked so petals **fade out as they travel under the text and fade back in** on the other side (`#fade-mask`, `lg` and up). (`HostingScene.tsx`): the **web glyph drawn in petals** — outer ring, meridian, equator and two parallels, each line a stream of tiny petals travelling along it at its own pace, so the internet looks alive . Wires leave the globe's edge to four devices stacked on the right — phone, laptop, tablet, desktop — and **petals themselves travel the wires** (GSAP `MotionPathPlugin`, tangent-aligned), each landing on its device as the screen lights — every device shows a different thing (app, deck, doc, site), in that petal's colour. A *You · deploy v4* chip above feeds a honey petal down into the globe. Hosting is ongoing, so it loops slowly. It also *reacts*: scrolling stirs the web (wobble amplitude scales with scroll speed and decays back to calm) and the pointer nudges petals within ~110px away by a few pixels (`motion/Agitator.tsx`). The 606 stream petals share **one clock per stream** — nine tweens sampling a path measured once, not one timeline each; that is why this section is affordable at all. Off-screen everything stops, so the rest of the page pays nothing for it. Under reduced motion nothing flies, nothing reacts, and every screen is lit. Below `lg` the stage keeps a 520px minimum inside a horizontal scroller.

### 5.4b Legacy publishing band (`M-DESK`, retired)

The ensemble still (`desk-ensemble.jpg`) sits **behind** the copy, masked so type stays readable (left/centre copy, still stronger on the right — same idea as the hero letterpress).

On reveal:

1. Still settles (opacity 0.0→0.55, 900ms)
2. HTML URL chip does the Live verb (same as console)
3. No extra loop. The still is a photograph, not a carousel

This is the “one body of work” proof. Do not collage six separate files here; use the ensemble.

### 5.5 Atmosphere — the shader (`M-AMBIENT`)

**This is *the* ambient system. Do not add a second one, and no section may
carry a background of its own** (`DESIGN.md` §7). A section that paints its own
scrolls against a fixed backdrop, and its clipped edge reads as a seam.

One fullscreen quad running one fragment program (`AmbientShader.tsx`,
`ambient.frag.ts`) sits fixed behind the whole page. The mesh, ribbons, four
lamplight orbs, conic beams, soft grid, five rings, twenty motes and the
vignette are all analytic maths in that one shader, ported stop-for-stop from
the CSS it replaced.

- **No grain. None.** The page wants clear, smooth visuals. The only thing
  applied at the end is a ±1/255 ordered dither, which is the *opposite* of
  grain: it is sub-perceptual and exists solely to stop these very wide, very
  soft gradients collapsing into contour rings on an 8-bit display. Remove it
  and "smooth" bands. Do not re-add a noise or fibre layer.
- **Twenty motes. Not twenty-one.** §5.6 refuses particle fields.
- **Colour lives at the edges.** The centre column stays clean paper. This is
  what keeps body copy readable over the atmosphere — not decoration.
- **Full device resolution.** A shader costs the same at 1× and 3×, so there is
  no resolution compromise to make and nothing that behaves differently by DPR.
  Capped at `min(devicePixelRatio, 2)` and throttled to 30fps — the orbs drift
  on 22–30s periods and the rings turn once every 120s, so nothing here moves
  fast enough to need more.
- **Scroll:** neutral at the very top (the hero must match its designed frame
  exactly), cooling and drifting up as you descend, plus a stir that decays
  back to calm. Honey and green only.
- **The drifting shadow.** One soft honey-deep blob traces a closed
  figure-eight, one circuit every 46s. It is deliberately the slowest thing on
  the page — a few pixels a second. Its falloff is concentrated (`pow`) so it
  reads as a defined shadow passing over paper rather than a haze. One blob;
  a second would make this a lava lamp.
- **Five fireflies.** Warm orange points drifting toward and away from the
  camera. Position comes from three incommensurate sines per axis, so they
  wander smoothly with no visible period and no state on the CPU. A depth term
  drives size, brightness and focus *together* — near ones are large, bright
  and soft-edged, far ones small, dim and crisp — which is what makes the third
  axis read as depth rather than as scale. **Five. Not fifteen:** §5.6 refuses
  particle fields, and the line between "a few fireflies" and "a particle
  field" is exactly the count. They do not blink.
- **Reduced motion:** one frame with time frozen. No loop at all.
- **Fallbacks:** a static `.ambient-mesh` div sits under the canvas. It is what
  a no-JS visitor sees, what shows when WebGL is unavailable, and what covers
  the gap before the first frame. The renderer is only constructed after a
  successful `getContext` probe, because a throw here would take down the page
  over decoration.

Also still shipping: `surface-lift` on cards, 3px, 300ms, `--ease-out-soft`.

### 5.7 The app page (`M-APP`, `/app`)

The only section here that is not on the homepage. Same four verbs, nothing new.

| Beat | What | Timing |
|------|------|--------|
| 1 | H1 settles | `hero-enter`, delay 0.05s |
| 2 | Sub settles, then the swash inks under "in one place" | `hero-enter` 0.12s, `hero-swash` |
| 3 | Download row settles | `hero-enter` 0.19s |
| 4 | Beta strip settles | `hero-enter` 0.26s |
| 5 | Laptop scales in | `Reveal variant="scale"`, delay 80ms |
| 6 | Phone rises under its corner | `Reveal variant="up"`, delay 260ms |

Below the hero: `Reveal` only — `left`/`fade`/`right` across the one-window row (the module grid staggers on `--i` via `stagger-child`), a 60ms stagger down the six capability cards, and `scale` on the two bands. The honey and green bands reuse `band-blob`; no new drift.

Both device screens are **real captures** of the shipped app — `public/desktop_screenshot.png` in the laptop and `public/mobile_screenshot.png` in the phone. This is the exception §5's no-photograph rule always anticipated: the rule exists so generated pictures are never trusted with "Allr" or `allr.app/your-launch`, and a screenshot of the real product is the one image that cannot get those wrong. It applies to the app page only — the homepage stays entirely drawn.

The drawn mocks in `src/components/app/mocks.tsx` are kept, unrendered, as the fallback if a capture is ever pulled. `DeviceFrame` crops `bleed` pixels off every edge, so a raw capture needs no retouching before it ships.

### 5.6 What we refuse

- Typewriter on the H1
- Looping gradient text
- Bounce on every card
- Lottie robots, particle fields, 3D glass
- Autoplaying sound
- Confetti, particles, anything that celebrates *at* the visitor — "live" is a status, shown once: deploy line, ring pulse, drawn check
- A second hero video replacing the console
- Generated pictures that contain the word Allr, a URL, or UI copy
- Half-size emoji as the only picture of an artifact

---

## 6. Component map

| Piece | File |
|-------|------|
| Spec | `MOTION.md` (this file) |
| **Motion authority** (plugins, named eases, timing constants, `matchMedia`) | `src/lib/motion.ts` |
| Page atmosphere | `src/components/AmbientShader.tsx`, `src/components/ambient.frag.ts` |
| Reveal trigger | `src/components/motion/revealQueue.ts` |
| Hero entrance driver | `src/components/motion/HeroEnter.tsx` |
| Hosting flights + reaction | `src/components/motion/Agitator.tsx` |
| Petal the header lights | `src/lib/petalFocus.ts` |
| Still registry | `src/lib/visuals.ts` |
| Still + states | `src/components/visuals/ArtifactStill.tsx` |
| App page sequence | `src/components/app/AppHero.tsx` |
| App page drawn screens | `src/components/app/mocks.tsx` |
| Device frames | `src/components/ui/DeviceFrame.tsx` |
| Workspace | `src/components/Workspace.tsx` |
| The Bloom | `src/components/BloomJourney.tsx` |
| Petal registry | `src/lib/petals.ts` |
| Petal shape | `src/components/ui/PetalShape.tsx` |
| Parallax | `src/components/motion/Parallax.tsx` |
| Story stage | `src/components/HowItWorks.tsx` |
| Phones | `src/components/OnYourPhone.tsx` |
| Artifact mocks | `src/components/mocks/Mocks.tsx` |
| The mark (bloom) | `src/components/ui/AllrMark.tsx` |
| Make cards | `src/components/WhatAllrMakes.tsx`, `src/components/ui/Card.tsx` |
| How-it-works miniatures | `src/components/HowItWorks.tsx` |
| Desk ensemble | `src/components/PublishingBand.tsx` |
| Remaining CSS keyframes | `src/app/globals.css` — see §9 |


---

## 9. Where motion lives

Motion is **GSAP** (`gsap` + `@gsap/react`, registered once in `src/lib/motion.ts`).
Everything imperative goes there: sequences, entrances, scroll-driven motion,
and the hosting flights. One clock, and one place — `gsap.matchMedia()` — that
decides what `prefers-reduced-motion` means.

That last point is not a style preference. The global CSS kill-switch in
`globals.css` (`animation: none !important`) **cannot stop GSAP**, because GSAP
writes inline styles. Any new tween must therefore be created inside
`gsap.matchMedia()`, and its `still` branch must place things at the done/live
frame per §2 — never simply do nothing.

The named eases are registered with `CustomEase` under the names in §2, so a
tween reads like this file. They are not interchangeable with GSAP's built-ins:
`power3.out` is **not** `cubic-bezier(0.22, 1, 0.36, 1)`.

### Two traps that have already broken this site

**1. GSAP cannot see `transform-box`.** It renders SVG transforms by baking the
origin into the matrix and writing `transform-origin: 0px 0px` to stop the
browser applying it twice — correct only under the SVG default `view-box`.
Under `transform-box: fill-box` that zero means the fill box's top-left, and
the element lands a bounding box away from where it should be. On the mark that
threw the petals clean off the disc.

> **Never tween `scale`/`rotation`/`x`/`y` with GSAP on an element whose CSS
> sets `transform-box: fill-box`.** Tween a registered custom property instead
> and let CSS apply the transform with its own origin — `--turn` and `--pop` on
> the mark, `--wipe` on the reveal. Grep for `transform-box` before adding any
> SVG tween.

**2. A one-shot scroll trigger needs live layout.** `ScrollTrigger` caches
positions at refresh and they go stale when layout settles afterwards (late
fonts, slow first paint), silently stranding whole pages of reveals.
`IntersectionObserver` reads live layout but delivers asynchronously, so under
slow frames an element can enter *and leave* between deliveries and be skipped
for good. Reveals therefore use `motion/revealQueue.ts` — one shared passive
scroll listener, rAF-coalesced, re-measuring only the elements still waiting.
ScrollTrigger stays where it belongs: scrubbed motion (Parallax, the Bloom
gear, the sticky story), where a continuously updated value hides staleness.

**3. `overflow-hidden` on a section clips the glow of anything inside it.**
The phones in `OnYourPhone` carry a `0 40px 90px` shadow and are parallaxed, so
their glow reaches ~130px past them and that reach *moves* as you scroll. The
section clipped it at its own border, producing a hard line that slid up the
page — the seam that was reported. `body` already sets `overflow-x: hidden`, so
a section almost never needs its own clip.

> **Before putting `overflow-hidden` on a section, check what casts a shadow
> inside it.** Give the shadow room in the padding instead. The same applies to
> translucent surfaces: a card at `bg-card/95` lets the background through at
> 5%, which is invisible as light but very visible as a hard edge where a glow
> crosses the card's border. Cards over the shader are opaque.

### What is deliberately still CSS

Not everything belongs in JS. These stay as stylesheet rules on purpose:

| Kept in CSS | Why |
|---|---|
| Hover / focus transitions (`surface-lift`, buttons, focus rings) | GSAP would need a pointer listener on every card to do what one CSS rule does. |
| The first frame of a reveal or hero entrance (`.js [data-reveal="hidden"]`, `.hero-enter`) | Applied by a blocking script *before* first paint. Any JS runs after it, so setting it in GSAP would flash the content in and back out on every load. |
| Declarative state glows — `live-glow`, `dot-breathe`, `screen-on` | A class React toggles. CSS is the right tool for "while this class is present"; GSAP would mean an effect per component for no gain. |
| Ambient loops on always-present decoration — `band-blob`, `pulse-glow` | Infinite, no sequencing, no JS ticker needed. |
| `swash-in` (`::before`), `ring-out` (`::after`) | GSAP cannot target pseudo-elements. |
| `mote-wobble` | Runs on 606 SVG nodes. Measured: CSS is cheaper here than any JS driver. |
| The mark's rotate/scale, the reveal's wipe | GSAP drives `--turn` / `--pop` / `--wipe`; CSS owns the transform. See trap 1 above. |

---

## 7. Production notes for the stills

1. Generate `style-master.jpg` first (the room).
2. Derive each artifact with `image_edit` from that master so lamp direction and paper stock stay put.
3. Reject any frame with readable fake headlines, logos, or screens.
4. Crop with a 4:3 safe area; important object in the centre 70%.
5. Commit the JPEGs; do not hotlink session cache.

---

## 8. QA

- [ ] Desk plays once on first view; a scenario chip or Watch again replays
- [ ] Waitlist success shows the glowing ticket; Share copies the page URL
- [ ] Six stills share lamp direction (upper-left honey)
- [ ] No generated text is legible as a word
- [ ] URL and Live are always HTML
- [ ] Reduced motion: done/live, no sweep, no confetti, no pulse
- [ ] 390px wide phone: tiles 2-up, stills still read as objects
- [ ] 1440px / projector: ensemble is not muddy, green ring is ≥2px CSS
- [ ] No layout jump when a still finishes (reserve height)
