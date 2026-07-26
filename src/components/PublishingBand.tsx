import { Reveal } from "@/components/Reveal";
import { Pill } from "@/components/ui/Pill";

export function PublishingBand() {
  return (
    <section id="publish" className="pt-0 pb-22">
      <div className="wrap">
        <Reveal
          className="relative overflow-hidden rounded-panel border border-[#F0DEB8] bg-[linear-gradient(150deg,#FDF3DF,var(--color-honey-tint)_55%,#F3ECDC)] px-7 py-14 text-center shadow-soft sm:px-8 sm:py-16"
          variant="scale"
        >
          <div
            aria-hidden="true"
            className="band-blob absolute -top-[120px] -right-[120px] size-[340px] rounded-full bg-[radial-gradient(closest-side,rgba(233,168,62,.28),transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="band-blob band-blob--slow absolute -bottom-[140px] -left-[100px] size-[280px] rounded-full bg-[radial-gradient(closest-side,rgba(46,158,99,.12),transparent_70%)]"
          />

          <Pill tone="green" className="relative mb-[18px]">
            The publishing layer
          </Pill>

          <h2 className="relative mb-[18px] text-[clamp(1.7rem,3.2vw,2.3rem)]">
            Nothing dies in a silo.
          </h2>

          <div className="prose-block relative mb-7">
            <p>
              Every other AI tool stops at the download button. Allr keeps
              going.
            </p>
            <p>
              Every project has a built-in publishing layer — generate your deck
              or your app, then share it with the world from the same place you
              made it. Your work gets a home, a link, and an audience, the
              moment it&rsquo;s done.
            </p>
          </div>

          <span className="relative inline-flex items-center gap-2.5 rounded-control border border-green-line bg-card px-4 py-2 font-semibold text-ink shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
            <span className="live-pulse size-1.5 rounded-full bg-green" />
            <span className="font-mono text-[.9rem] tracking-tight">
              allr.app/your-launch
            </span>
            <span className="rounded-chip bg-green-tint px-2.5 py-1 text-[.72rem] font-bold tracking-[0.03em] text-green-deep uppercase">
              Copy link
            </span>
          </span>

          <p className="relative mt-7 font-serif text-[1.18rem] text-honey-deep">
            Because the point was never the file. The point was people seeing
            it.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
