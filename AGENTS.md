<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Allr marketing site

This is the consumer welcome surface for Allr. Before changing copy, color, type, layout, motion, or a component:

1. Read [`DESIGN.md`](./DESIGN.md) — the contract.
2. Read [`MOTION.md`](./MOTION.md) before changing homepage motion or stills.
3. Open `/design` — the living spec (noindex).
4. Import locked phrases from `src/lib/brand.ts`. Do not invent a new tagline, promise, or output list.
5. Use tokens in `src/app/globals.css`. Do not introduce zinc/slate, a third font, or a fourth hue.
6. Prefer primitives in `src/components/ui/` over one-off styling.

If a change needs a new color, font, radius, or slogan, update `DESIGN.md` first, then the token, then the page.

Voice: mentor, not vendor. Product: one workspace that makes finished work and publishes it. Not a copilot, not an agent runtime, not a self-host pitch.

Locked product calls (see DESIGN.md §16): docs migrate to paper; primary CTAs are Download (desktop app, `/download`) and Get early access (mobile waitlist); `/design` stays URL-only (noindex, no footer link).
