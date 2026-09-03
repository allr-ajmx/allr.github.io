import { DownloadRow } from "@/components/app/DownloadRow";
import { Reveal } from "@/components/Reveal";
import { DeviceFrame } from "@/components/ui/DeviceFrame";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { HeroEnter } from "@/components/motion/HeroEnter";
import { APP } from "@/lib/brand";

export function AppHero({ version }: { version: string | null }) {
  return (
    <section className="relative overflow-hidden" data-petal="5">
      <HeroEnter />

      <div className="wrap relative z-10 grid items-center gap-14 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:py-24">
        <div className="flex flex-col items-start">
          <h1
            className="hero-enter mb-6 text-[clamp(2.3rem,4.8vw,3.35rem)] tracking-[-0.015em] text-balance"
            data-enter="0.05"
          >
            {APP.hero.headline}
          </h1>

          <p
            className="hero-enter mb-10 max-w-[38ch] text-[clamp(1.05rem,1.5vw,1.2rem)] text-pretty text-ink-soft"
            data-enter="0.12"
          >
            {APP.hero.subLead}
            <span className="hero-swash relative font-bold whitespace-nowrap text-ink before:absolute before:-inset-x-[2%] before:bottom-[.05em] before:-z-10 before:h-[.34em] before:rounded-full before:bg-green-tint before:content-['']">
              {APP.hero.subSwash}
            </span>
            {APP.hero.subRest}
          </p>

          <div className="hero-enter" data-enter="0.19">
            <DownloadRow version={version} />
          </div>

          {/* mt-[76px] = the old mt-9 (36px) + 40px: the phone mock tucks under
              the laptop's corner and was reaching into this strip. */}
          <div
            className="hero-enter mt-[76px] flex w-full max-w-[480px] flex-wrap items-center gap-x-4 gap-y-4"
            data-enter="0.26"
          >
            <span className="shrink-0 text-ink-soft">
              <PlatformIcon platform="mobile" size={20} />
            </span>
            <div className="min-w-[210px] flex-1">
              <p className="font-bold text-pretty">{APP.hero.betaTitle}</p>
              <p className="text-[.95rem] text-ink-soft">{APP.hero.betaSub}</p>
            </div>
            <a
              href="#get"
              className="inline-flex shrink-0 items-center rounded-control border border-line bg-card px-[18px] py-2.5 text-[.98rem] font-bold whitespace-nowrap text-ink no-underline transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 hover:border-[#D8CFBB] hover:bg-paper active:translate-y-0"
            >
              {APP.hero.betaCta}
            </a>
          </div>
        </div>

        {/*
          The laptop carries the scene and the phone tucks under its corner,
          clear of the screen. The size gap is what tells you at a glance that
          this is one app on two very different devices.

          Both screens are real captures rather than the drawn mocks in
          `app/mocks.tsx` — the frames crop their own edges, so the raw files
          need no retouching. See MOTION.md §5.
        */}
        <div className="relative pb-12 sm:pb-8">
          <Reveal variant="scale" delay={80}>
            <DeviceFrame
              variant="laptop"
              src="/desktop_screenshot.png"
              alt="The Allr workspace — sessions, the work in progress, and the files it produced"
              width={1280}
              height={978}
              bleed={0}
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
            />
          </Reveal>
          <Reveal
            variant="up"
            delay={260}
            className="absolute -bottom-2 left-0 w-[96px] sm:-bottom-4 sm:-left-9 sm:w-[112px]"
          >
            <DeviceFrame
              variant="phone"
              src="/mobile_screenshot.png"
              alt="Allr on a phone, mid-conversation"
              width={1170}
              height={2532}
              bleed={0}
              sizes="112px"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
