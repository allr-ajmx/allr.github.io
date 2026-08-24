import { Reveal } from "@/components/Reveal";
import { Pill } from "@/components/ui/Pill";
import { VersionsMock } from "@/components/mocks/Mocks";
import { Parallax } from "@/components/motion/Parallax";

export function PublishingBand() {
  return (
    <section id="publish" className="pt-6 pb-22">
      <div className="wrap">
        <Reveal
          className="relative overflow-hidden rounded-panel border border-[#F0DEB8] bg-[linear-gradient(150deg,#FDF3DF,var(--color-honey-tint)_55%,#F3ECDC)] px-7 py-14 shadow-soft sm:px-8 sm:py-16"
          variant="scale"
        >
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,30rem)]">
          <div className="max-w-[34rem] text-left">
            <Pill tone="green" className="mb-[18px]">
              It’s live
            </Pill>

            <h2 className="mb-[18px] text-[clamp(1.7rem,3.2vw,2.3rem)]">
              Your work gets a home, a link, and an audience.
            </h2>

            <div className="prose-block mb-7 max-lg:mx-auto !ml-0 max-lg:text-center">
              <p>
                Every other AI tool stops at the download button. Allr keeps
                going: the moment a thing is finished, it&rsquo;s on the
                internet, at a link that&rsquo;s yours.
              </p>
              <p>
                Every change is a new version. Change your mind? Go back to
                the one you liked, in one click. Nothing you make ever gets
                lost in a downloads folder.
              </p>
            </div>

            <span className="inline-flex items-center gap-2.5 rounded-control border border-green-line bg-card px-4 py-2 font-semibold text-ink shadow-soft transition-transform duration-300 hover:-translate-y-0.5">
              <span className="live-pulse size-1.5 rounded-full bg-green" />
              <span className="font-mono text-[.9rem] tracking-tight">
                allr.app/your-launch
              </span>
              <span className="rounded-chip bg-green-tint px-2.5 py-1 text-[.72rem] font-bold tracking-[0.03em] text-green-deep uppercase">
                Live
              </span>
            </span>

            <p className="mt-7 font-serif text-[1.18rem] text-honey-deep">
              Because the point was never the file. The point was people seeing
              it.
            </p>
          </div>
          <Parallax speed={0.1} className="mock-frame w-full">
            <VersionsMock />
          </Parallax>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
