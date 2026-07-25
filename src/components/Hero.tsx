import { LaunchConsole } from "@/components/LaunchConsole";

export function Hero() {
  return (
    <section className="relative">
      {/* soft lamplight glow — sits behind the graphics side on wide screens */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(233,168,62,.16),transparent_70%)] lg:left-auto lg:right-0 lg:translate-x-1/4"
      />

      <div className="wrap relative grid min-h-[calc(100svh-74px)] items-center gap-14 py-16 lg:grid-cols-2 lg:gap-10">
        {/* copy — left */}
        <div className="text-left">
          <h1 className="relative mb-6">
            <span className="block text-[clamp(3rem,7vw,5rem)]">Allr</span>
            <span className="mt-3 block text-[clamp(1.5rem,3vw,2.3rem)]">
              the one subscription that{" "}
              <span className="relative whitespace-nowrap text-green-deep before:absolute before:-inset-x-[2%] before:bottom-[.05em] before:-z-10 before:h-[.34em] before:rounded-full before:bg-green-tint before:content-['']">
                replaces all of them.
              </span>
            </span>
          </h1>

          <p className="max-w-[48ch] text-[1.02rem] text-ink-soft">
            One AI workspace that makes finished work — decks, docs, videos,
            websites, apps, and games.
          </p>
        </div>

        {/* graphics — right */}
        <div className="w-full">
          <LaunchConsole />
        </div>
      </div>
    </section>
  );
}
