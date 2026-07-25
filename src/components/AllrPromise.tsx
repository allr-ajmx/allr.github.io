import { Reveal } from "@/components/Reveal";

export function AllrPromise() {
  return (
    <section className="py-[30px]">
      <div className="wrap">
        <Reveal className="mx-auto max-w-[720px] px-6 py-2.5 text-center">
          <blockquote className="font-serif text-[clamp(1.35rem,2.8vw,1.8rem)] leading-[1.45]">
            &ldquo;You bring the idea. We&rsquo;ll take care of everything
            between you and{" "}
            <span className="text-green-deep">&lsquo;it&rsquo;s live.&rsquo;</span>
            &rdquo;
          </blockquote>
          <span className="mt-[18px] inline-flex items-center gap-[.5em] text-[.95rem] font-extrabold text-ink-soft">
            <span
              aria-hidden="true"
              className="inline-flex size-[22px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_30%,#F6C56B,var(--color-honey)_55%,var(--color-honey-deep))] text-[.7rem] text-white"
            >
              ✦
            </span>
            The Allr promise
          </span>
        </Reveal>
      </div>
    </section>
  );
}
