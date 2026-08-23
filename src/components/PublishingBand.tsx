import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Pill } from "@/components/ui/Pill";
import { asset } from "@/lib/asset";
import { DESK_ENSEMBLE } from "@/lib/visuals";

export function PublishingBand() {
  return (
    <section id="publish" className="pt-0 pb-22">
      <div className="wrap">
        <Reveal
          className="relative overflow-hidden rounded-panel border border-[#F0DEB8] bg-[linear-gradient(150deg,#FDF3DF,var(--color-honey-tint)_55%,#F3ECDC)] px-7 py-14 shadow-soft sm:px-8 sm:py-16"
          variant="scale"
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[58%] max-lg:opacity-40 lg:w-[52%]">
            <Image
              src={asset(DESK_ENSEMBLE.src)}
              alt=""
              fill
              sizes="(max-width: 860px) 100vw, 520px"
              className="object-cover object-[70%_45%] scale-110"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#FDF3DF] via-[#FDF3DF]/70 to-transparent lg:from-[#FDF3DF] lg:via-[#FDF3DF]/55 lg:to-transparent" />
          </div>

          <div className="relative max-w-[34rem] text-left max-lg:text-center max-lg:mx-auto">
            <Pill tone="green" className="mb-[18px]">
              The publishing layer
            </Pill>

            <h2 className="mb-[18px] text-[clamp(1.7rem,3.2vw,2.3rem)]">
              Nothing dies in a silo.
            </h2>

            <div className="prose-block mb-7 max-lg:mx-auto !ml-0 max-lg:text-center">
              <p>
                Every other AI tool stops at the download button. Allr keeps
                going.
              </p>
              <p>
                Every project has a built-in publishing layer — generate your
                deck or your app, then share it with the world from the same
                place you made it. Your work gets a home, a link, and an
                audience, the moment it&rsquo;s done.
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
        </Reveal>
      </div>
    </section>
  );
}
