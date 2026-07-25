import { LaunchConsole } from "@/components/LaunchConsole";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";

export function Hero() {
  return (
    <section className="relative px-0 pt-20 pb-10 text-center">
      {/* soft lamplight glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(233,168,62,.16),transparent_70%)]"
      />

      <div className="wrap">
        <Pill tone="honey" className="mb-6">
          One workspace, every kind of work
        </Pill>

        <h1 className="relative mx-auto mb-[22px] max-w-[20ch] text-[clamp(2.3rem,5.2vw,3.7rem)]">
          Allr — the one subscription that{" "}
          <span className="relative whitespace-nowrap text-green-deep before:absolute before:-inset-x-[2%] before:bottom-[.05em] before:-z-10 before:h-[.34em] before:rounded-full before:bg-green-tint before:content-['']">
            replaces all of them.
          </span>
        </h1>

        <p className="mx-auto mb-3.5 max-w-[58ch] text-[1.16rem] text-ink-soft">
          One AI workspace that makes finished work — from decks, docs,
          spreadsheets, and videos, all the way to working websites, apps, and
          games. Describe what you want. Allr makes it, and helps you share it
          with the world.
        </p>

        <p className="mb-[30px] text-[.98rem] font-bold text-honey-deep">
          You bring the idea. Allr takes care of the rest.
        </p>

        <div className="mb-[66px] flex flex-wrap justify-center gap-3.5">
          <Button href="#final" size="lg">
            Start creating free
          </Button>
          <Button href="#makes" variant="ghost" size="lg">
            See what Allr can make →
          </Button>
        </div>

        <LaunchConsole />
      </div>
    </section>
  );
}
