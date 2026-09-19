"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import {
  ALL_ROADMAP_ITEMS,
  ROADMAP_PAGE_COPY,
  ROADMAP_TRACK_IMPROVEMENTS,
  ROADMAP_TRACK_STORY,
  type RoadmapItem,
  type RoadmapStatus,
  type RoadmapTrack,
} from "@/lib/brand";
import { cx } from "@/lib/cx";

const STATUS_CONFIG: Record<
  RoadmapStatus,
  { label: string; tile: string; dot: string }
> = {
  available: {
    label: "Available",
    tile: "border-green-line bg-green-tint text-green-deep",
    dot: "bg-green",
  },
  progress: {
    label: "In progress",
    tile: "border-honey-line bg-honey-tint text-honey-deep",
    dot: "bg-honey",
  },
  upcoming: {
    label: "Upcoming",
    tile: "border-line bg-paper text-ink-soft",
    dot: "bg-ink-soft/40",
  },
};

const TINT_ACCENTS: Record<RoadmapItem["tint"], string> = {
  honey: "border-l-honey",
  sage: "border-l-petal-0",
  green: "border-l-green",
  clay: "border-l-honey-deep",
};

interface RoadmapCardProps {
  item: RoadmapItem;
  index: number;
}

function RoadmapCard({ item, index }: RoadmapCardProps) {
  const statusMeta = STATUS_CONFIG[item.status];

  return (
    <article
      className={cx(
        "stagger-child group relative flex flex-col justify-between rounded-card border border-line bg-card p-6 shadow-soft transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-line hover:shadow-lift border-l-[3px]",
        TINT_ACCENTS[item.tint],
      )}
      style={{ ["--i" as string]: index }}
    >
      <div>
        {/* Card Header: Item Number, Pillar Tag & Status */}
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.95rem] font-bold text-ink-soft/60">
              #{item.number}
            </span>
            <span className="rounded-chip border border-line-soft bg-paper px-2.5 py-0.5 text-[0.78rem] font-semibold text-ink-soft">
              {item.pillar}
            </span>
          </div>

          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-0.5 text-[0.78rem] font-semibold",
              statusMeta.tile,
            )}
          >
            <span
              className={cx("size-1.5 shrink-0 rounded-full", statusMeta.dot)}
              aria-hidden="true"
            />
            {statusMeta.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-1.5 font-serif text-[1.28rem] text-ink transition-colors group-hover:text-green-deep">
          {item.title}
        </h3>

        {/* Subtitle */}
        <p className="mb-3 text-[0.92rem] font-bold text-ink-soft">
          {item.subtitle}
        </p>

        {/* Body Description */}
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">
          {item.description}
        </p>
      </div>

      {/* Card Footing Subtle Metadata */}
      <div className="mt-5 border-t border-line-soft pt-3 flex items-center justify-between text-[0.78rem] text-ink-soft/70 font-medium">
        <span>
          {item.track === "story" ? "Allr Story Core" : "Product Suite"}
        </span>
        <span className="opacity-80 capitalize">{item.status}</span>
      </div>
    </article>
  );
}

export function RoadmapPageContent() {
  const searchInputId = useId();
  const [selectedTrack, setSelectedTrack] = useState<RoadmapTrack | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoadmapStatus | "all">("all");

  const storyItems = useMemo(() => {
    return ROADMAP_TRACK_STORY.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pillar.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const improvementItems = useMemo(() => {
    return ROADMAP_TRACK_IMPROVEMENTS.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pillar.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const totalFilteredCount = storyItems.length + improvementItems.length;

  return (
    <div className="relative pt-6 pb-24">
      {/* 1. Page Header & Introduction */}
      <section className="wrap relative mb-12">
        <Reveal className="mx-auto max-w-[820px] text-center">
          <span className="mb-2.5 inline-block text-[0.82rem] font-bold tracking-wider text-honey-deep uppercase">
            Platform Roadmap
          </span>
          <h1 className="mb-4 font-serif text-[clamp(2.2rem,5vw,3.6rem)] text-ink">
            {ROADMAP_PAGE_COPY.title}
          </h1>
          <p className="mx-auto max-w-[660px] text-[1.08rem] leading-relaxed text-ink-soft">
            {ROADMAP_PAGE_COPY.sub}
          </p>

          {/* Quick Jump Bar */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-[0.92rem]">
            <span className="font-semibold text-ink-soft">Jump to:</span>
            <a
              href="#foundation"
              className="rounded-chip border border-line bg-card px-3 py-1.5 font-bold text-ink-soft no-underline shadow-soft transition-[transform,border-color,color] duration-150 hover:-translate-y-0.5 hover:border-line hover:text-ink"
            >
              Part 1: The Allr Story ({ROADMAP_PAGE_COPY.trackStory.count})
            </a>
            <a
              href="#improvements"
              className="rounded-chip border border-line bg-card px-3 py-1.5 font-bold text-ink-soft no-underline shadow-soft transition-[transform,border-color,color] duration-150 hover:-translate-y-0.5 hover:border-line hover:text-ink"
            >
              Part 2: Product Improvements ({ROADMAP_PAGE_COPY.trackImprovements.count})
            </a>
          </div>
        </Reveal>

        {/* 2. Interactive Filter & Search Bar */}
        <Reveal className="mx-auto mt-10 max-w-[920px]" delay={60}>
          <div className="flex flex-col gap-4 rounded-panel border border-line-soft bg-paper/90 p-4 shadow-soft backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            {/* Track Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTrack("all")}
                className={cx(
                  "cursor-pointer rounded-control px-3.5 py-1.5 text-[0.88rem] font-bold transition-all duration-150",
                  selectedTrack === "all"
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink-soft hover:bg-card hover:text-ink",
                )}
              >
                All Capabilities ({ALL_ROADMAP_ITEMS.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack("story")}
                className={cx(
                  "cursor-pointer rounded-control px-3.5 py-1.5 text-[0.88rem] font-bold transition-all duration-150",
                  selectedTrack === "story"
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink-soft hover:bg-card hover:text-ink",
                )}
              >
                Allr Story ({ROADMAP_PAGE_COPY.trackStory.count})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack("improvements")}
                className={cx(
                  "cursor-pointer rounded-control px-3.5 py-1.5 text-[0.88rem] font-bold transition-all duration-150",
                  selectedTrack === "improvements"
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink-soft hover:bg-card hover:text-ink",
                )}
              >
                Product Suite ({ROADMAP_PAGE_COPY.trackImprovements.count})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-[280px]">
              <label htmlFor={searchInputId} className="sr-only">
                Search roadmap items
              </label>
              <input
                id={searchInputId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search capability or pillar…"
                className="w-full rounded-control border border-line bg-card px-3.5 py-1.5 text-[0.9rem] text-ink placeholder:text-ink-soft/60 focus:border-honey focus:outline-none focus:ring-2 focus:ring-honey/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Status Quick Filter Chips */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[0.82rem] text-ink-soft">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Filter status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cx(
                  "cursor-pointer rounded-chip px-2 py-0.5 transition-colors",
                  statusFilter === "all"
                    ? "bg-ink/10 font-bold text-ink"
                    : "hover:text-ink",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("progress")}
                className={cx(
                  "cursor-pointer rounded-chip px-2 py-0.5 transition-colors",
                  statusFilter === "progress"
                    ? "bg-honey-tint font-bold text-honey-deep"
                    : "hover:text-ink",
                )}
              >
                In progress
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("upcoming")}
                className={cx(
                  "cursor-pointer rounded-chip px-2 py-0.5 transition-colors",
                  statusFilter === "upcoming"
                    ? "bg-paper border border-line font-bold text-ink"
                    : "hover:text-ink",
                )}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("available")}
                className={cx(
                  "cursor-pointer rounded-chip px-2 py-0.5 transition-colors",
                  statusFilter === "available"
                    ? "bg-green-tint font-bold text-green-deep"
                    : "hover:text-ink",
                )}
              >
                Available
              </button>
            </div>

            <div>
              <span>Showing </span>
              <strong className="text-ink">{totalFilteredCount}</strong>
              <span> of {ALL_ROADMAP_ITEMS.length} items</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 3. Empty State if nothing matches */}
      {totalFilteredCount === 0 && (
        <section className="wrap py-16 text-center">
          <div className="mx-auto max-w-[480px] rounded-card border border-line bg-card p-8 shadow-soft">
            <h3 className="mb-2 font-serif text-[1.3rem] text-ink">
              No matching capabilities
            </h3>
            <p className="mb-4 text-[0.95rem] text-ink-soft">
              We couldn’t find anything matching &ldquo;{searchQuery}&rdquo;. Try clearing your search term or status filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSelectedTrack("all");
              }}
              className="rounded-control bg-ink px-4 py-2 text-[0.88rem] font-bold text-white transition-opacity hover:opacity-90"
            >
              Reset Filters
            </button>
          </div>
        </section>
      )}

      {/* 4. TRACK 1: The Allr Story Foundation */}
      {(selectedTrack === "all" || selectedTrack === "story") &&
        storyItems.length > 0 && (
          <section id="foundation" className="wrap relative mb-20 scroll-mt-24">
            <Reveal className="mb-8">
              <div className="border-b border-line-soft pb-5">
                <span className="mb-1 inline-block text-[0.82rem] font-bold tracking-wider text-green-deep uppercase">
                  {ROADMAP_PAGE_COPY.trackStory.eyebrow}
                </span>
                <h2 className="mb-2 font-serif text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink">
                  {ROADMAP_PAGE_COPY.trackStory.title}
                </h2>
                <p className="max-w-[720px] text-[1.02rem] leading-relaxed text-ink-soft">
                  {ROADMAP_PAGE_COPY.trackStory.sub}
                </p>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {storyItems.map((item, index) => (
                  <RoadmapCard key={item.id} item={item} index={index} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

      {/* 5. TRACK 2: Product Suites & Experience Improvements */}
      {(selectedTrack === "all" || selectedTrack === "improvements") &&
        improvementItems.length > 0 && (
          <section id="improvements" className="wrap relative mb-20 scroll-mt-24">
            <Reveal className="mb-8">
              <div className="border-b border-line-soft pb-5">
                <span className="mb-1 inline-block text-[0.82rem] font-bold tracking-wider text-honey-deep uppercase">
                  {ROADMAP_PAGE_COPY.trackImprovements.eyebrow}
                </span>
                <h2 className="mb-2 font-serif text-[clamp(1.7rem,3.4vw,2.4rem)] text-ink">
                  {ROADMAP_PAGE_COPY.trackImprovements.title}
                </h2>
                <p className="max-w-[720px] text-[1.02rem] leading-relaxed text-ink-soft">
                  {ROADMAP_PAGE_COPY.trackImprovements.sub}
                </p>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {improvementItems.map((item, index) => (
                  <RoadmapCard key={item.id} item={item} index={index} />
                ))}
              </div>
            </Reveal>
          </section>
        )}

      {/* 6. Closing Resolve & Next Steps */}
      <section className="wrap relative pt-8">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <SectionHead title="Stop rebuilding the plumbing. Start operating.">
            Turn your product brief into live, dependable software. Workspaces on web, desktop, and mobile.
          </SectionHead>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login/"
              className="inline-flex items-center justify-center rounded-control bg-green px-6 py-3 text-[1rem] font-bold text-white no-underline shadow-[0_8px_20px_rgba(46,158,99,.28)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-green-deep"
            >
              Get Started
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center justify-center rounded-control border border-line bg-card px-6 py-3 text-[1rem] font-bold text-ink no-underline shadow-soft transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-line"
            >
              Download Allr
            </Link>
          </div>

          <p className="mt-4 text-[0.88rem] text-ink-soft">
            Have questions about an upcoming integration? Reach out anytime.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
