import Link from "next/link";
import { AmbientShader } from "@/components/AmbientShader";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * The frame both legal pages share.
 *
 * The version string on the page is the same constant the stored consent
 * records, so the two can never drift. Body copy is finished wording — not
 * scaffold intent — once a version ships as 1.0 or later.
 */

export type LegalSection = {
  heading: string;
  /** One or more paragraphs of finished policy text. */
  body: readonly string[];
};

export function LegalPage({
  title,
  intro,
  version,
  updated,
  sections,
  otherHref,
  otherLabel,
}: {
  title: string;
  intro: string;
  /**
   * Recorded against every signature, shown to nobody.
   *
   * The page says when it last changed, because that is what a reader wants to
   * know. The version string is bookkeeping — it exists so a stored consent can
   * name exactly what was agreed to.
   */
  version: string;
  updated: string;
  sections: readonly LegalSection[];
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <>
      <AmbientShader />
      <Header />
      <main
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
                <div className="mt-3 flex flex-col gap-3">
                  {section.body.map((paragraph, j) => (
                    <p
                      key={`${section.heading}-${j}`}
                      className="text-[1.02rem] leading-[1.7] text-ink-soft"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
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
            <Link href={otherHref} className="font-bold text-ink underline">
              {otherLabel}
            </Link>
            .
          </p>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
