# Allr homepage motion & visuals

Production spec for the GitHub Pages landing (`allr.github.io`). Pair with `DESIGN.md` (voice, color, type). This file is the contract for **what moves, how, and what it looks like**.

If a motion is not listed here, it does not ship. If a still is not in `public/visuals/`, do not invent a new one on the page.

---

## 1. Intent

The homepage has one visual sentence:

> Work lands on paper. It turns green. Then it gets a link.

Visitors should feel they are watching a **desk at the end of the day**, not a product demo of software chrome. Artifacts are photographed objects (letterpress, laid paper, lamplight). UI chrome (URL, Live, labels, waitlist) is HTML, because generated pictures cannot be trusted with “Allr” or `allr.app/your-launch`.

Three verbs. Nothing else.

| Verb | Means | Feel |
|------|--------|------|
| **Settle** | It arrived on the desk | Slow, heavy, paper dropping into place |
| **Ink** | It is being made | Honey lamplight, a held breath, no spinner-as-toy |
| **Live** | Someone else can see it | Green, a small lift, a pulse that dies down |

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

## 3. Visual system (stills)

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

### 5.1 Hero — Launch console (`M-CONSOLE`)

The signature. Plays once when ≥25% of the console is in view. Replay is a deliberate click.

**Stage**

- Browser chrome (HTML): traffic lights, `allr.app/your-launch`, Live chip
- 2×3 grid of artifact stills (Deck … App)
- Status line + count `n/6`

**Timeline** (t=0 is first intersection)

| t | What |
|---|------|
| 0–400ms | Console settles (`scale 0.98→1`, opacity 0→1, `--ease-out-soft`) |
| 400ms | URL pip is **honey**. Live chip is scale 0.9 / opacity 0 |
| 400 + n×STEP | Artifact *n* enters **working** (INK) |
| 400 + n×STEP + 0.88×STEP | Artifact *n* enters **done** (LIVE). Status copy advances |
| after last LIVE + 380ms | Console border goes `green-line`. Green outer glow `0 0 0 4px rgba(46,158,99,.06)`. Live chip springs in. URL pip turns green. Live pulse runs twice. Confetti: 24 paper-fibre chips (green/honey only), fall 1.7s, then gone — not a loop |
| Replay | Snap to idle, run the clock again |

**Status copy** (mentor, already in `LaunchConsole`): one line, no counts except `n/6`.

**Reduced motion:** paint all six **done**, Live on, no confetti, no pulse.

### 5.2 What Allr makes (`M-CARDS`)

Six cards. Each has the matching still at **16:10** on top, then title + body + ready/live pill.

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

### 5.4 Publishing band (`M-DESK`)

The ensemble still (`desk-ensemble.jpg`) sits **behind** the copy, masked so type stays readable (left/centre copy, still stronger on the right — same idea as the hero letterpress).

On reveal:

1. Still settles (opacity 0.0→0.55, 900ms)
2. HTML URL chip does the Live verb (same as console)
3. No extra loop. The still is a photograph, not a carousel

This is the “one body of work” proof. Do not collage six separate files here; use the ensemble.

### 5.5 Atmosphere (already shipping)

Keep. Do not add a second ambient system.

- Paper mesh, lamplight orbs, grain, slow drift (22–30s)
- Hero letterpress stamp settle (1.25s)
- `surface-lift` on cards: 3px, 300ms, `--ease-out-soft`

### 5.6 What we refuse

- Typewriter on the H1
- Looping gradient text
- Bounce on every card
- Lottie robots, particle fields, 3D glass
- Autoplaying sound
- A second hero video replacing the console
- Generated pictures that contain the word Allr, a URL, or UI copy
- Half-size emoji as the only picture of an artifact

---

## 6. Component map

| Piece | File |
|-------|------|
| Spec | `MOTION.md` (this file) |
| Still registry | `src/lib/visuals.ts` |
| Still + states | `src/components/visuals/ArtifactStill.tsx` |
| Console sequence | `src/components/LaunchConsole.tsx` |
| Make cards | `src/components/WhatAllrMakes.tsx`, `src/components/ui/Card.tsx` |
| How-it-works miniatures | `src/components/HowItWorks.tsx` |
| Desk ensemble | `src/components/PublishingBand.tsx` |
| Keyframes | `src/app/globals.css` (`.artifact-ink`, `.artifact-live`, `.light-sweep`) |
| Binaries | `public/visuals/*.jpg` |

---

## 7. Production notes for the stills

1. Generate `style-master.jpg` first (the room).
2. Derive each artifact with `image_edit` from that master so lamp direction and paper stock stay put.
3. Reject any frame with readable fake headlines, logos, or screens.
4. Crop with a 4:3 safe area; important object in the centre 70%.
5. Commit the JPEGs; do not hotlink session cache.

---

## 8. QA

- [ ] Console plays once on first view; Watch again replays
- [ ] Six stills share lamp direction (upper-left honey)
- [ ] No generated text is legible as a word
- [ ] URL and Live are always HTML
- [ ] Reduced motion: done/live, no sweep, no confetti, no pulse
- [ ] 390px wide phone: tiles 2-up, stills still read as objects
- [ ] 1440px / projector: ensemble is not muddy, green ring is ≥2px CSS
- [ ] No layout jump when a still finishes (reserve height)
