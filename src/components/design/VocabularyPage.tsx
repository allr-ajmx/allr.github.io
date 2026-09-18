"use client";

import Link from "next/link";
import { AmbientShader } from "@/components/AmbientShader";
import { Swatch } from "@/components/design/Swatch";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { JunkPill, OnePill } from "@/components/ui/JunkPill";
import { Logo } from "@/components/ui/Logo";
import { Pill } from "@/components/ui/Pill";
import { SectionHead } from "@/components/ui/SectionHead";
import {
  AUDIENCES,
  CTA,
  ETYMOLOGY,
  LOOP,
  NEVER_SAY,
  OUTPUTS,
  PROMISE,
  SAY,
  SITE_TAGLINE,
  WORDMARK,
} from "@/lib/brand";

const GROUND = [
  { token: "paper", hex: "#FDFCF9", meaning: "Evening paper — page wash", className: "bg-paper" },
  { token: "card", hex: "#FFFFFF", meaning: "A sheet on the desk", className: "bg-card" },
  { token: "ink", hex: "#223B33", meaning: "Deep pine — headlines", className: "bg-ink" },
  { token: "ink-soft", hex: "#5C7168", meaning: "Quiet pine — body", className: "bg-ink-soft" },
  { token: "line", hex: "#E7E0D2", meaning: "Paper edge", className: "bg-line" },
  { token: "line-soft", hex: "#EFE9DC", meaning: "Softer rule", className: "bg-line-soft" },
] as const;

const HONEY = [
  { token: "honey", hex: "#E9A83E", meaning: "Lamplight — in progress", className: "bg-honey" },
  { token: "honey-deep", hex: "#B77E1F", meaning: "Aged brass — asides", className: "bg-honey-deep" },
  { token: "honey-tint", hex: "#FBEFD8", meaning: "Warm wash", className: "bg-honey-tint" },
  { token: "honey-line", hex: "#F0DCB4", meaning: "Warm edge", className: "bg-honey-line" },
] as const;

const GREEN = [
  { token: "green", hex: "#2E9E63", meaning: "Done / live — primary", className: "bg-green" },
  { token: "green-deep", hex: "#1E7A49", meaning: "Accomplished — hover", className: "bg-green-deep" },
  { token: "green-tint", hex: "#E4F4EA", meaning: "Done wash", className: "bg-green-tint" },
  { token: "green-line", hex: "#C2E5D0", meaning: "Done edge", className: "bg-green-line" },
] as const;

const TINTS = [
  { token: "sage-tint", hex: "#ECF2EC", meaning: "Quiet green sticker", className: "bg-sage-tint" },
  { token: "clay-tint", hex: "#F6EDE2", meaning: "Warm clay sticker", className: "bg-clay-tint" },
] as const;

/**
 * A state, not a hue (DESIGN.md §5). The only thing it may say is that
 * something the person typed needs fixing — it never decorates.
 */
const ALERT = [
  { token: "alert", hex: "#A6543C", meaning: "Needs fixing — error text", className: "bg-alert" },
  { token: "alert-tint", hex: "#F9E9E4", meaning: "Error wash", className: "bg-alert-tint" },
  { token: "alert-line", hex: "#EFCFC4", meaning: "Error edge", className: "bg-alert-line" },
] as const;

const RADII = [
  { token: "chip", value: "8px", className: "rounded-chip", used: "eyebrows, status" },
  { token: "control", value: "10px", className: "rounded-control", used: "buttons, inputs" },
  { token: "card", value: "16px", className: "rounded-card", used: "cards, console" },
  { token: "panel", value: "20px", className: "rounded-panel", used: "feature bands" },
] as const;

export function VocabularyPage() {
  return (
    <>
      <AmbientShader />
      <header className="sticky top-0 z-50 border-b-[1.5px] border-line-soft bg-paper/80 backdrop-blur-[14px]">
        <div className="wrap flex h-[74px] items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-[1.55rem] no-underline transition-opacity duration-200 hover:opacity-80"
          >
            <Logo size={36} priority />
            {WORDMARK}
          </Link>
          <nav
            className="hidden gap-6 text-[.92rem] font-bold text-ink-soft min-[721px]:flex"
            aria-label="Spec"
          >
            <a href="#voice" className="nav-link no-underline hover:text-ink">
              Voice
            </a>
            <a href="#color" className="nav-link no-underline hover:text-ink">
              Color
            </a>
            <a href="#type" className="nav-link no-underline hover:text-ink">
              Type
            </a>
            <a href="#components" className="nav-link no-underline hover:text-ink">
              Components
            </a>
          </nav>
          <Button href="/" variant="ghost" size="sm">
            Back to Allr
          </Button>
        </div>
      </header>

      <main className="relative">
        <section className="wrap py-16">
          <Pill tone="honey" className="mb-5">
            Internal spec · noindex
          </Pill>
          <h1 className="mb-4 max-w-[18ch] text-[clamp(2.4rem,5vw,3.6rem)]">
            Design vocabulary
          </h1>
          <p className="max-w-[58ch] text-[1.08rem] text-ink-soft">
            The Allr that a visitor meets: warm paper, product and operations
            for the AI Era. Tokens, copy, and components for every later
            marketing page. The written contract is{" "}
            <strong>DESIGN.md</strong> in this repo. Click a hex or token to
            copy it.
          </p>
        </section>

        <section id="product" className="pb-22">
          <div className="wrap">
            <SectionHead
              eyebrow="Product"
              title="Product-and-operations platform."
            >
              Not a chatbot. Not a copilot. Product and operations on web,
              desktop, and mobile — ideate, create, deploy, operate, maintain,
              scale.
            </SectionHead>
            <Reveal className="mx-auto max-w-[720px] rounded-panel border border-line bg-card px-7 py-8 text-center shadow-soft">
              <p className="font-serif text-[clamp(1.35rem,2.8vw,1.8rem)] leading-[1.45]">
                {PROMISE}
              </p>
              <p className="mt-4 text-[.95rem] font-bold text-ink-soft">
                The Allr promise · {SITE_TAGLINE}
              </p>
            </Reveal>
            <div className="mx-auto mt-8 grid max-w-[720px] grid-cols-2 gap-3 min-[641px]:grid-cols-3">
              {LOOP.map((step, i) => (
                <Reveal
                  key={step}
                  delay={i * 60}
                  className="rounded-card border border-line bg-card px-5 py-5 text-center shadow-soft"
                >
                  <span className="mb-2 inline-flex size-8 items-center justify-center rounded-control bg-honey-tint font-serif text-honey-deep">
                    {i + 1}
                  </span>
                  <p className="font-serif text-[1.05rem]">{step}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="voice" className="pb-22">
          <div className="wrap">
            <SectionHead eyebrow="Voice" tone="honey" title="Mentor, not vendor.">
              Warm, not cute. Operating, not generating. Kitchen-table lamplight,
              not a YC launch post.
            </SectionHead>
            <div className="grid grid-cols-1 gap-5 min-[761px]:grid-cols-2">
              <Reveal className="rounded-card border border-green-line bg-green-tint/60 px-6 py-6 shadow-soft">
                <h3 className="mb-3 text-[1.15rem]">Say</h3>
                <div className="flex flex-wrap gap-2">
                  {SAY.map((word) => (
                    <span
                      key={word}
                      className="rounded-chip border border-green-line bg-card px-2.5 py-1 text-[.85rem] font-bold text-green-deep"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </Reveal>
              <Reveal
                delay={80}
                className="rounded-card border border-[#EFCFC4] bg-[#F9E9E4] px-6 py-6 shadow-soft"
              >
                <h3 className="mb-3 text-[1.15rem]">Never say</h3>
                <div className="flex flex-wrap gap-2">
                  {NEVER_SAY.map((word) => (
                    <span
                      key={word}
                      className="rounded-chip border border-[#EFCFC4] bg-card px-2.5 py-1 text-[.85rem] font-bold text-[#A6543C] line-through opacity-80"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>
            <Reveal className="prose-block mt-10">
              <p>
                Wordmark is lowercase <strong>{WORDMARK}</strong>. In sentences,
                write <strong>Allr</strong>. Quiet brand line:{" "}
                <em className="not-italic text-green-deep">{ETYMOLOGY}</em>
              </p>
            </Reveal>
          </div>
        </section>

        <section id="color" className="pb-22">
          <div className="wrap">
            <SectionHead eyebrow="Color" title="Green is done. Honey is warmth.">
              Semantic, not decorative. No fourth hue. No zinc, no black ink, no
              neon.
            </SectionHead>
            <h3 className="mb-4 text-[1.15rem]">Ground</h3>
            <div className="mb-10 grid grid-cols-2 gap-4 min-[761px]:grid-cols-3">
              {GROUND.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>
            <h3 className="mb-4 text-[1.15rem]">Honey — in progress</h3>
            <div className="mb-10 grid grid-cols-2 gap-4 min-[761px]:grid-cols-4">
              {HONEY.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>
            <h3 className="mb-4 text-[1.15rem]">Green — live</h3>
            <div className="mb-10 grid grid-cols-2 gap-4 min-[761px]:grid-cols-4">
              {GREEN.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>
            <h3 className="mb-4 text-[1.15rem]">Sticker tints</h3>
            <div className="grid grid-cols-2 gap-4 min-[761px]:grid-cols-4">
              {TINTS.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>

            <h3 className="mt-10 mb-4 text-[1.15rem]">
              Alert — a state, never a fourth hue
            </h3>
            <p className="mb-4 max-w-[60ch] text-ink-soft">
              The only thing this red may say is that something the person typed
              needs fixing. It never decorates, never fills a surface, and never
              appears on a page with no form on it.
            </p>
            <div className="grid grid-cols-2 gap-4 min-[721px]:grid-cols-4">
              {ALERT.map((s) => (
                <Swatch key={s.token} {...s} />
              ))}
            </div>
          </div>
        </section>

        <section id="type" className="pb-22">
          <div className="wrap">
            <SectionHead eyebrow="Type" title="Serif for the thing. Sans for the work.">
              Young Serif at 400 only — never bold it. Nunito Sans for body and
              UI. No third family on marketing.
            </SectionHead>
            <div className="grid grid-cols-1 gap-5 min-[761px]:grid-cols-2">
              <Reveal className="rounded-card border border-line bg-card px-6 py-8 shadow-soft">
                <p className="mb-3 text-[.8rem] font-bold tracking-[0.04em] text-ink-soft uppercase">
                  Young Serif · display
                </p>
                <p className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.18]">
                  Operating products, live.
                </p>
              </Reveal>
              <Reveal
                delay={80}
                className="rounded-card border border-line bg-card px-6 py-8 shadow-soft"
              >
                <p className="mb-3 text-[.8rem] font-bold tracking-[0.04em] text-ink-soft uppercase">
                  Nunito Sans · body
                </p>
                <p className="text-[1.08rem] leading-[1.7] text-ink-soft">
                  Allr is the Product and Operations platform for the AI Era.
                  You ideate. Allr helps you create, deploy, operate, and maintain.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="shape" className="pb-22">
          <div className="wrap">
            <SectionHead
              eyebrow="Shape"
              tone="green"
              title="Soft rectangles. Stationery, not lozenges."
            />
            <div className="grid grid-cols-2 gap-4 min-[761px]:grid-cols-4">
              {RADII.map((r) => (
                <Reveal
                  key={r.token}
                  className="rounded-card border border-line bg-card px-4 py-5 text-center shadow-soft"
                >
                  <div
                    className={`mx-auto mb-3 size-16 border border-green-line bg-green-tint ${r.className}`}
                  />
                  <p className="font-serif">{r.token}</p>
                  <p className="font-mono text-[.8rem] text-ink-soft">{r.value}</p>
                  <p className="mt-1 text-[.8rem] text-ink-soft">{r.used}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="components" className="pb-22">
          <div className="wrap">
            <SectionHead
              eyebrow="Components"
              title="Use these. Don’t restyle them."
            />

            <h3 className="mb-4 text-[1.15rem]">Buttons</h3>
            <Reveal className="mb-12 flex flex-wrap items-center gap-3 rounded-card border border-line bg-card px-6 py-6 shadow-soft">
              <Button href="#components" size="sm">
                {CTA.primary}
              </Button>
              <Button href="#components" variant="ghost" size="sm">
                {CTA.secondary}
              </Button>
              <Button size="sm">{CTA.status}</Button>
              <span className="rounded-panel bg-green px-4 py-3">
                <Button href="#components" variant="white" size="sm">
                  On a green band
                </Button>
              </span>
            </Reveal>

            <h3 className="mb-4 text-[1.15rem]">Pills</h3>
            <Reveal className="mb-12 flex flex-wrap items-center gap-3">
              <Pill>The problem</Pill>
              <Pill tone="honey">Who it&rsquo;s for</Pill>
              <Pill tone="green">The publishing layer</Pill>
              <JunkPill tilt="left">SlideThing · $18/mo</JunkPill>
              <OnePill>allr · one plan</OnePill>
            </Reveal>

            <h3 className="mb-4 text-[1.15rem]">Form controls</h3>
            <p className="mb-4 max-w-[60ch] text-ink-soft">
              Labels are visible, not placeholders: a placeholder disappears the
              moment you type, and &ldquo;what was this box for?&rdquo; is not a
              question a legal-name field may provoke. Errors are added below the
              field, so it never loses its name.
            </p>
            <Reveal className="mb-12 flex flex-col gap-6 rounded-card border border-line bg-card px-6 py-6 shadow-soft">
              <FormSpecimen />
            </Reveal>

            <h3 className="mb-4 text-[1.15rem]">Output cards</h3>
            <div className="mb-12 grid grid-cols-1 gap-5 min-[561px]:grid-cols-2 min-[861px]:grid-cols-3">
              {OUTPUTS.map((item, i) => (
                <Card
                  key={item.id}
                  sticker={item.sticker}
                  tint={item.tint}
                  title={item.title}
                  ready={item.ready}
                  delay={i * 50}
                >
                  {item.body}
                </Card>
              ))}
            </div>

            <h3 className="mb-4 text-[1.15rem]">Audiences</h3>
            <div className="grid grid-cols-1 gap-5 min-[561px]:grid-cols-2">
              {AUDIENCES.map((item, i) => (
                <Card
                  key={item.id}
                  sticker={item.sticker}
                  tint={item.tint}
                  title={item.title}
                  delay={i * 50}
                >
                  {item.body}
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="ship" className="pb-22">
          <div className="wrap">
            <SectionHead
              eyebrow="How to ship"
              tone="honey"
              title="A new marketing page, in order."
            />
            <ol className="mx-auto max-w-[640px] list-decimal space-y-3 pl-5 text-[1.02rem] text-ink-soft">
              <li>Read DESIGN.md and this page.</li>
              <li>
                Import copy from <code className="rounded-chip bg-honey-tint px-1.5 py-0.5 font-semibold text-ink">src/lib/brand.ts</code> — do not rewrite the tagline.
              </li>
              <li>Use Header, Footer, AmbientShader unless the page is a legal stub.</li>
              <li>Reach for SectionHead, Card, Button, Pill before inventing a block.</li>
              <li>Wrap is 1080px. Prose is 640px. Headings are Young Serif 400.</li>
              <li>Primary CTA is green. Secondary is ghost. Status has no href.</li>
              <li>Check mobile and prefers-reduced-motion.</li>
              <li>If you needed a new color, font, radius, or slogan — update DESIGN.md first.</li>
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/**
 * The form primitives, live and interactive — including their error state,
 * which is the one you cannot see from a screenshot.
 */
function FormSpecimen() {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <Field
        label="Legal name"
        hint="As it appears on your ID or payment card."
        required
      >
        {(props) => (
          <input
            {...props}
            type="text"
            className="allr-field"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        )}
      </Field>

      <Field label="Country of residence" required>
        {(props) => (
          <Select
            {...props}
            placeholder="Choose a country"
            value={country}
            onChange={(e) => setCountry(e.currentTarget.value)}
          >
            <option value="GB">United Kingdom</option>
            <option value="IN">India</option>
            <option value="US">United States</option>
          </Select>
        )}
      </Field>

      <Field
        label="This one is showing its error state"
        error="You have to be 18 or over to have an Allr account."
      >
        {(props) => (
          <input {...props} type="date" className="allr-field" readOnly value="2015-04-02" />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <p className="text-[.92rem] font-bold text-ink">Mobile testing</p>
        <ChoiceChips
          legend="Mobile testing"
          options={[
            { id: "ios", label: "iOS" },
            { id: "android", label: "Android" },
          ]}
          value={platform}
          onChange={setPlatform}
        />
      </div>

      <Checkbox
        checked={agreed}
        onChange={setAgreed}
        label="I agree to the Terms of Use."
        hint="Consent is its own tick, never bundled with another."
      />

      <Field label="Denser, for the signed-in shell">
        {(props) => (
          <input
            {...props}
            type="text"
            className="allr-field allr-field--dense"
            placeholder="Controls may be denser behind a login (§13)"
          />
        )}
      </Field>
    </>
  );
}
