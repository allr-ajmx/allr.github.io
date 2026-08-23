import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import { ArtifactStill } from "@/components/visuals/ArtifactStill";

const NUM_TINTS = [
  "bg-honey-tint text-honey-deep",
  "bg-sage-tint text-ink",
  "bg-green-tint text-green-deep",
];

const KBD =
  "not-italic rounded-lg border border-line-soft bg-paper px-[.45em] py-[.05em] font-bold";

const STEPS = [
  {
    title: "Describe it.",
    body: (
      <>
        Tell Allr what you need in plain language —{" "}
        <em className={KBD}>&ldquo;a landing page for my album launch,&rdquo;</em>{" "}
        <em className={KBD}>&ldquo;a budget model for my studio,&rdquo;</em>{" "}
        <em className={KBD}>
          &ldquo;a playable demo of my game idea.&rdquo;
        </em>
      </>
    ),
    aside: "No jargon needed. Just say it like you'd say it to a friend.",
  },
  {
    title: "Allr makes it.",
    body: (
      <>
        Allr picks the right tools behind the scenes and generates a finished
        asset — not a starting point you have to finish yourself.
      </>
    ),
    aside: "The pills go green. That's your work, done.",
  },
  {
    title: "Ship it.",
    body: (
      <>
        Publish straight from your project. A link for your deck, a live URL for
        your site, a share page for your video. From idea to audience without
        leaving the platform.
      </>
    ),
    aside: "That feeling when it's out in the world? That's the point.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-22">
      <div className="wrap">
        <SectionHead eyebrow="How it works" title="Three steps. No stitching." />

        <div className="mx-auto grid max-w-[540px] grid-cols-1 gap-5 min-[821px]:max-w-none min-[821px]:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.title}
              delay={i * 110}
              className="surface-lift rounded-card border border-line bg-card/95 px-6 py-7 shadow-soft backdrop-blur-[2px]"
            >
              <span
                className={`mb-4 inline-flex size-10 items-center justify-center rounded-control font-serif text-[1.1rem] ${NUM_TINTS[i]}`}
              >
                {i + 1}
              </span>
              <h3 className="mb-2.5 text-[1.28rem]">{step.title}</h3>
              <p className="text-ink-soft">{step.body}</p>
              {i === 1 ? (
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {(["decks", "docs", "websites"] as const).map((id, n) => (
                    <div
                      key={id}
                      className="stagger-child"
                      style={{ ["--i" as string]: n }}
                    >
                      <ArtifactStill
                        id={id}
                        className="artifact-still--on-reveal"
                        sizes="120px"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {i === 2 ? (
                <span className="mt-4 inline-flex items-center gap-2 rounded-control border border-green-line bg-card px-3 py-1.5 text-[.82rem] font-semibold text-ink shadow-soft">
                  <span className="live-pulse size-1.5 rounded-full bg-green" />
                  <span className="font-mono tracking-tight">allr.app/your-launch</span>
                </span>
              ) : null}
              <p className="mt-3.5 text-[.92rem] font-bold text-honey-deep">
                {step.aside}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
