import Image from "next/image";
import { LaunchConsole } from "@/components/LaunchConsole";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft lamplight glow — sits behind the graphics side on wide screens */}
      <div
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(233,168,62,.20),transparent_70%)] lg:left-auto lg:right-0 lg:translate-x-1/4"
      />
      {/* secondary green wash under the console */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[40%] right-[-8%] hidden h-[360px] w-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(46,158,99,.10),transparent_72%)] lg:block"
      />

      {/*
        Oversized letterpress stamp — anchored on the right, overflowing the
        edge, fading into center so the whole hero feels printed on stamped paper.
      */}
      <div
        aria-hidden="true"
        className="hero-engrave pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="hero-engrave-place absolute top-1/2 right-[-32%] w-[min(120vw,920px)] -translate-y-1/2 sm:right-[-28%] sm:w-[min(95vw,860px)] lg:right-[-26%] lg:w-[min(68vw,900px)] xl:right-[-22%]">
          {/* Inner wrapper owns rotation/settle so positioning isn't clobbered */}
          <div className="hero-engrave-mark relative">
            {/* dark bite layer — sits slightly SE for carved depth */}
            <Image
              src="/logo_base.svg"
              alt=""
              width={900}
              height={900}
              unoptimized
              priority
              className="hero-engrave-shadow h-auto w-full select-none"
            />
            {/* main ink impression */}
            <Image
              src="/logo_base.svg"
              alt=""
              width={900}
              height={900}
              unoptimized
              priority
              className="hero-engrave-ink absolute inset-0 h-auto w-full select-none"
            />
            {/* light rim — slight NW offset for paper catch-light */}
            <Image
              src="/logo_base.svg"
              alt=""
              width={900}
              height={900}
              unoptimized
              className="hero-engrave-highlight absolute inset-0 h-auto w-full select-none"
            />
          </div>
        </div>
      </div>

      <div className="wrap relative z-10 grid min-h-[calc(100svh-74px)] items-center gap-14 py-16 lg:grid-cols-2 lg:gap-10">
        {/* copy — left */}
        <div className="text-left">
          <p
            className="hero-enter mb-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-honey-line bg-honey-tint/80 px-3.5 py-1.5 text-[.82rem] font-extrabold tracking-[0.02em] text-honey-deep"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="size-1.5 rounded-full bg-honey" aria-hidden="true" />
            One workspace. Finished work.
          </p>

          <h1
            className="hero-enter relative mb-6"
            style={{ animationDelay: "0.12s" }}
          >
            <span className="block text-[clamp(3rem,7vw,5rem)] tracking-tight">
              Allr
            </span>
            <span className="mt-3 block text-[clamp(1.5rem,3vw,2.3rem)]">
              the one subscription that{" "}
              <span className="hero-swash relative whitespace-nowrap text-green-deep before:absolute before:-inset-x-[2%] before:bottom-[.05em] before:-z-10 before:h-[.34em] before:rounded-full before:bg-green-tint before:content-['']">
                replaces all of them.
              </span>
            </span>
          </h1>

          <p
            className="hero-enter max-w-[48ch] text-[1.02rem] text-ink-soft"
            style={{ animationDelay: "0.28s" }}
          >
            One AI workspace that makes finished work — decks, docs, videos,
            websites, apps, and games.
          </p>

          <div
            className="hero-enter mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "0.4s" }}
          >
            <a
              href="#final"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green px-[1.8em] py-[.85em] text-base font-extrabold text-white no-underline shadow-[0_10px_24px_rgba(46,158,99,.30)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:bg-green-deep hover:shadow-[0_14px_32px_rgba(46,158,99,.36)] active:translate-y-0"
            >
              Get early access
            </a>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] border-line bg-card/80 px-[1.5em] py-[.85em] text-base font-extrabold text-ink no-underline backdrop-blur-sm transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-[#D8CFBB] hover:bg-card active:translate-y-0"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* graphics — right */}
        <div
          className="hero-enter-console w-full"
          style={{ animationDelay: "0.35s" }}
        >
          <LaunchConsole />
        </div>
      </div>
    </section>
  );
}
