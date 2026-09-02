"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { DOWNLOAD } from "@/lib/brand";
import { cx } from "@/lib/cx";
import {
  detectPlatform,
  fetchLatestRelease,
  formatReleaseDate,
  formatSize,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  resolveDownloads,
  type Platform,
  type Release,
} from "@/lib/releases";

/** The detected platform never changes during a session, so nothing to watch. */
const noopSubscribe = () => () => {};

export function DownloadPage({ release: initial }: { release: Release | null }) {
  const [release, setRelease] = useState(initial);

  // Detected once on the client; the server renders no "your platform" badge.
  const mine = useSyncExternalStore<Platform | undefined>(
    noopSubscribe,
    () => detectPlatform(),
    () => undefined,
  );

  // Catch a release published since the last site build.
  useEffect(() => {
    let live = true;
    fetchLatestRelease().then((fresh) => {
      if (live && fresh) setRelease(fresh);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <AmbientBackground />
      <Header />
      <main id="top" className="relative">
        <section className="wrap flex flex-col items-center pt-20 pb-10 text-center sm:pt-28">
          <div className="hero-enter mb-6"><AllrMark size={56} bloom /></div>
          <h1 className="hero-enter mb-5 max-w-[16ch] text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] tracking-[-0.015em]" style={{ animationDelay: "0.1s" }}>
            {DOWNLOAD.title}
          </h1>
          <p className="hero-enter max-w-[44ch] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-snug text-ink-soft" style={{ animationDelay: "0.2s" }}>
            {DOWNLOAD.sub}
          </p>
          <p className="hero-enter mt-6 rounded-chip border border-line bg-card/80 px-3 py-1.5 font-mono text-[.78rem] text-ink-soft" style={{ animationDelay: "0.3s" }}>
            {release
              ? DOWNLOAD.version(release.version, formatReleaseDate(release.publishedAt))
              : DOWNLOAD.versionUnknown}
          </p>
        </section>

        <section className="wrap pb-16">
          <div className="grid gap-5 md:grid-cols-3">
            {PLATFORM_ORDER.map((id, i) => {
              const builds = resolveDownloads(release, id);
              const yours = mine === id;
              return (
                <Reveal
                  key={id}
                  delay={i * 80}
                  className={cx(
                    "relative flex flex-col rounded-panel border bg-card/95 p-7 shadow-soft backdrop-blur-[2px] transition-[border-color,box-shadow] duration-500",
                    yours ? "live-glow" : "border-line",
                  )}
                >
                  {yours ? (
                    <span className="absolute -top-3 left-6 rounded-chip bg-green px-2.5 py-1 text-[.68rem] font-bold tracking-[0.06em] text-white uppercase">{DOWNLOAD.yours}</span>
                  ) : null}
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-control bg-paper text-ink"><PlatformIcon platform={id} size={22} /></span>
                    <h2 className="text-[1.35rem]">{PLATFORM_LABELS[id]}</h2>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {builds.map((b, k) => (
                      <a
                        key={b.id}
                        href={b.href}
                        download
                        className={cx(
                          "flex flex-col items-start gap-0.5 rounded-control px-4 py-3 text-[.95rem] font-bold no-underline transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5",
                          k === 0 ? "bg-ink text-paper hover:bg-[#1a2e28]" : "border border-line bg-card text-ink hover:border-honey-line hover:bg-paper",
                        )}
                      >
                        {k === 0 ? `Download for ${PLATFORM_LABELS[id]}` : b.label}
                        <span className={cx("text-[.72rem] font-semibold", k === 0 ? "text-paper/70" : "text-ink-soft")}>
                          {[k === 0 ? b.label : null, b.hint, b.size ? formatSize(b.size) : null].filter(Boolean).join(" · ")}
                        </span>
                      </a>
                    ))}
                  </div>
                  <p className="mt-5 text-[.85rem] leading-relaxed text-ink-soft">
                    <span className="font-bold text-ink">{DOWNLOAD.requirements}: </span>{DOWNLOAD.needs[id]}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="wrap pb-24">
          <Reveal className="mx-auto flex max-w-[720px] flex-col items-center gap-4 rounded-panel border border-line bg-card/95 px-7 py-10 text-center shadow-soft backdrop-blur-[2px] sm:flex-row sm:text-left" variant="scale">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-honey-tint text-honey-deep"><PlatformIcon platform="mobile" size={24} /></span>
            <div className="flex-1">
              <h2 className="mb-1 text-[1.25rem]">{DOWNLOAD.mobileTitle}</h2>
              <p className="text-[.98rem] text-ink-soft">{DOWNLOAD.mobileBody}</p>
            </div>
            <Link href="/app#get" className="inline-flex shrink-0 items-center justify-center rounded-full bg-green px-5 py-2.5 text-[.95rem] font-bold text-white no-underline shadow-[0_8px_20px_rgba(46,158,99,.28)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-green-deep">
              {DOWNLOAD.mobileCta}
            </Link>
          </Reveal>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center">
            <Link href="/" className="text-[.92rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline">← {DOWNLOAD.back}</Link>
            <Link href="/app" className="text-[.92rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline">{DOWNLOAD.seeApp} →</Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
