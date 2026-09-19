"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AmbientShader } from "@/components/AmbientShader";
import { HeroEnter } from "@/components/motion/HeroEnter";
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
import type { AppConfig } from "@/lib/account/app-config";

/** The detected platform never changes during a session, so nothing to watch. */
const noopSubscribe = () => () => {};

/**
 * `config` is authoritative when `app_configuration` has been populated
 * (DESIGN.md §16): it names one link per platform and can be rolled back from
 * the database, which the GitHub Releases API cannot do — it only ever knows
 * what is latest.
 *
 * The GitHub path is kept underneath rather than replaced, because it carries
 * what app_configuration does not: every asset for a platform, its format and
 * its size. So a configured platform overrides the link and keeps the page's
 * shape, and an unconfigured one behaves exactly as it always has.
 */
export function DownloadPage({
  release: initial,
  config,
}: {
  release: Release | null;
  config?: AppConfig | null;
}) {
  const [release, setRelease] = useState(initial);
  const managed = config?.source === "app_configuration";
  const overrides = managed ? (config?.current?.downloads ?? {}) : {};

  // Detected once on the client; the server renders no "your platform" badge.
  const mine = useSyncExternalStore<Platform | undefined>(
    noopSubscribe,
    () => detectPlatform(),
    () => undefined,
  );

  // Catch a release published since the last render. Skipped when
  // app_configuration is in charge: refreshing from GitHub there would quietly
  // undo a rollback, which is the one thing app_configuration exists to do.
  useEffect(() => {
    if (managed) return;
    let live = true;
    fetchLatestRelease().then((fresh) => {
      if (live && fresh) setRelease(fresh);
    });
    return () => {
      live = false;
    };
  }, [managed]);

  return (
    <>
      <AmbientShader />
      <Header />
      <main id="top" className="relative">
        <section className="wrap flex flex-col items-center pt-20 pb-10 text-center sm:pt-28">
          <HeroEnter />
          <div className="hero-enter mb-6"><AllrMark size={56} bloom /></div>
          <h1 className="hero-enter mb-5 max-w-[16ch] text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] tracking-[-0.015em]" data-enter="0.1">
            {DOWNLOAD.title}
          </h1>
          <p className="hero-enter max-w-[44ch] text-[clamp(1.02rem,1.4vw,1.2rem)] leading-snug text-ink-soft" data-enter="0.2">
            {DOWNLOAD.sub}
          </p>
          <p className="hero-enter mt-6 rounded-chip border border-line bg-card px-3 py-1.5 font-mono text-[.78rem] text-ink-soft" data-enter="0.3">
            {managed && config?.current
              ? DOWNLOAD.version(
                  config.current.version,
                  formatReleaseDate(config.current.publishedAt ?? ""),
                )
              : release
                ? DOWNLOAD.version(release.version, formatReleaseDate(release.publishedAt))
                : DOWNLOAD.versionUnknown}
          </p>
        </section>

        <section className="wrap pb-16">
          <div className="grid gap-5 md:grid-cols-3">
            {PLATFORM_ORDER.map((id, i) => {
              const override = overrides[id];
              const builds = override
                ? [
                    {
                      id: `${id}-managed`,
                      label: config?.current?.version
                        ? `Version ${config.current.version}`
                        : "Latest build",
                      hint: "",
                      href: override,
                      size: 0,
                    },
                  ]
                : resolveDownloads(release, id);
              const yours = mine === id;
              return (
                <Reveal
                  key={id}
                  delay={i * 80}
                  className={cx(
                    "relative flex flex-col rounded-panel border bg-card p-7 shadow-soft transition-[border-color,box-shadow] duration-500",
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
          <Reveal
            className="mx-auto max-w-[720px] rounded-panel border border-line bg-card px-7 py-10 text-center shadow-soft"
            variant="scale"
          >
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-control bg-honey-tint text-honey-deep">
              <PlatformIcon platform="mobile" size={24} />
            </span>
            <h2 className="mb-1 text-[1.25rem]">{DOWNLOAD.mobileTitle}</h2>
            <p className="text-[.98rem] text-ink-soft">{DOWNLOAD.mobileBody}</p>
            <p className="mt-3 text-[.9rem] text-ink-soft">
              Mobile beta signup returns with the site rebuild.
            </p>
          </Reveal>
          <p className="mt-8 text-center">
            <Link
              href="/"
              className="text-[.92rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline"
            >
              ← {DOWNLOAD.back}
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
