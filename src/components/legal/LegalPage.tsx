import Link from "next/link";
import { AmbientShader } from "@/components/AmbientShader";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * The frame both legal pages share.
 *
 * These are scaffolds on purpose. The headings are the ones a policy of this
 * shape has to answer, and every one of them is marked as awaiting its real
 * wording — because a placeholder that reads like finished legal text is the
 * one kind of placeholder that can actually hurt somebody. The version string
 * on the page is the same constant the stored consent records, so the two can
 * never drift.
 */

export type LegalSection = {
  heading: string;
  /** What this section will have to say. Not the saying of it. */
  intent: string;
};

export function LegalPage({
  title,
  intro,
  version,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  /**
   * Recorded against every signature, shown to nobody.
   *
   * The page says when it last changed, because that is what a reader wants to
   * know. The version string is bookkeeping — it exists so a stored consent can
   * name exactly what was agreed to — and putting it under the title only
   * invited the question "which version am I on?", which is ours to answer, not
   * theirs to work out.
   */
  version: string;
  updated: string;
  sections: readonly LegalSection[];
}) {
  return (
    <>
      <AmbientShader />
      <Header />
      {/* The header is sticky and translucent; a legal page opens with a bare
          headline and no eyebrow above it, so without real room the title reads
          as though it is tucked under the bar. */}
      <main
        // Not shown — the reader wants a date, not a build number. It stays in
        // the markup so that a page can still be matched to the consent record
        // that names it, which is the only reason the version exists.
        data-policy-version={version}
        className="wrap pt-16 pb-22 min-[721px]:pt-24"
      >
        <Reveal variant="blur" className="mx-auto max-w-[720px]">
          <h1 className="font-serif text-[clamp(1.9rem,4vw,2.6rem)] leading-[1.18] text-ink">
            {title}
          </h1>
          <p className="mt-3 text-[.88rem] font-bold text-ink-soft">
            Last updated {updated}
          </p>
          <p className="mt-5 text-[1.08rem] leading-[1.7] text-ink-soft">
            {intro}
          </p>

          <div
            role="note"
            className="mt-8 rounded-card border border-honey-line bg-honey-tint px-5 py-4"
          >
            <p className="text-[.95rem] leading-[1.7] font-semibold text-honey-deep">
              <strong className="font-extrabold">This is a draft.</strong> The
              headings below are the questions this document has to answer. The
              wording is not written yet, so nothing here is a promise. Ask us
              anything in the meantime at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold text-honey-deep underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-8">
            {sections.map((section, i) => (
              <Reveal
                key={section.heading}
                delay={i * 45}
                className="border-t border-line pt-6"
              >
                <h2 className="font-serif text-[1.35rem] leading-[1.25] text-ink">
                  {section.heading}
                </h2>
                <p className="mt-2 text-[1.02rem] leading-[1.7] text-ink-soft">
                  {section.intent}
                </p>
              </Reveal>
            ))}
          </div>

          <p className="mt-12 border-t border-line pt-6 text-[.96rem] leading-[1.7] text-ink-soft">
            Questions about any of this go to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold text-ink underline"
            >
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link href="/terms/" className="font-bold text-ink underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy/" className="font-bold text-ink underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
