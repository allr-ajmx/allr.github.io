import { Reveal } from "@/components/Reveal";
import { Logo } from "@/components/ui/Logo";

export function AllrPromise() {
  return (
    <section className="relative py-[30px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-[200px] w-[min(720px,90%)] -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(46,158,99,.08),transparent_70%)]"
      />
      <div className="wrap relative">
        <Reveal
          className="mx-auto max-w-[720px] px-6 py-2.5 text-center"
          variant="fade"
        >
          <blockquote className="font-serif text-[clamp(1.35rem,2.8vw,1.8rem)] leading-[1.45]">
            &ldquo;You bring the idea. We&rsquo;ll take care of everything
            between you and{" "}
            <span className="text-green-deep">&lsquo;it&rsquo;s live.&rsquo;</span>
            &rdquo;
          </blockquote>
          <span className="mt-[18px] inline-flex items-center gap-[.5em] text-[.95rem] font-extrabold text-ink-soft">
            <Logo size={22} />
            The Allr promise
          </span>
        </Reveal>
      </div>
    </section>
  );
}
