import { Reveal } from "@/components/Reveal";
import { JunkPill, OnePill } from "@/components/ui/JunkPill";
import { SectionHead } from "@/components/ui/SectionHead";
import { PROBLEM_STACK } from "@/lib/brand";

export function Problem() {
  return (
    <section id="problem" className="relative pt-[60px] pb-22">
      <div className="wrap relative">
        <SectionHead
          eyebrow="The problem"
          title="Getting real work out of AI shouldn't take ten subscriptions."
        />

        <Reveal className="prose-block" delay={80}>
          <p>
            Today, there&rsquo;s an AI tool for slides. Another for documents.
            Another for video, another for websites, another for spreadsheets.
            Each one has its own subscription, its own login, its own way of
            working — and none of them talk to each other.
          </p>
          <p>
            So you end up paying for a stack of tools, copying context between
            apps, and doing the stitching yourself. Most people give up before
            they ship anything.
          </p>
          <p>
            <strong>
              That&rsquo;s not a workflow. That&rsquo;s a tax on getting things
              done.
            </strong>
          </p>
        </Reveal>

        <Reveal
          className="mx-auto mt-[46px] flex max-w-[840px] flex-wrap items-center justify-center gap-[30px]"
          aria-hidden="true"
          delay={120}
        >
          <div className="flex flex-col items-center gap-2.5">
            {PROBLEM_STACK.map((name, i) => (
              <span
                key={name}
                className="stagger-child"
                style={{ ["--i" as string]: i }}
              >
                <JunkPill dot tilt={i % 2 === 0 ? "left" : "right"}>
                  <s className="opacity-70">{name}</s>
                </JunkPill>
              </span>
            ))}
          </div>
          <span
            className="stagger-child font-serif text-[1.9rem] text-honey-deep"
            style={{ ["--i" as string]: PROBLEM_STACK.length }}
          >
            →
          </span>
          <span
            className="stagger-child"
            style={{ ["--i" as string]: PROBLEM_STACK.length + 1 }}
          >
            <OnePill>allr · everything ✓</OnePill>
          </span>
        </Reveal>
      </div>
    </section>
  );
}
