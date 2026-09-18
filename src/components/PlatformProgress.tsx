import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { SectionHead } from "@/components/ui/SectionHead";
import {
  PLATFORM_PROGRESS,
  ROADMAP,
  type ProgressStatus,
} from "@/lib/brand";
import { cx } from "@/lib/cx";

/** Status colour — Available green, In progress honey, Upcoming quiet. */
const STATUS_TILE: Record<ProgressStatus, string> = {
  available: "border-green-line bg-green-tint text-green-deep",
  progress: "border-honey-line bg-honey-tint text-honey-deep",
  upcoming: "border-line bg-paper text-ink-soft",
};

const STATUS_DOT: Record<ProgressStatus, string> = {
  available: "bg-green",
  progress: "bg-honey",
  upcoming: "bg-ink-soft/40",
};

/**
 * Desktop chips stay green; mobile chips stay orange (honey/amber) —
 * DESIGN.md petal rules, even when status would suggest otherwise.
 */
type ProgressItem = (typeof PLATFORM_PROGRESS.items)[number];

function chipOf(item: ProgressItem): "desktop" | "mobile" | undefined {
  return "chip" in item ? item.chip : undefined;
}

function tileFor(item: ProgressItem): string {
  const chip = chipOf(item);
  if (chip === "desktop") return STATUS_TILE.available;
  if (chip === "mobile") return STATUS_TILE.progress;
  return STATUS_TILE[item.status];
}

function dotFor(item: ProgressItem): string {
  const chip = chipOf(item);
  if (chip === "desktop") return STATUS_DOT.available;
  if (chip === "mobile") return STATUS_DOT.progress;
  return STATUS_DOT[item.status];
}

/**
 * Platform progress — honest Available / In progress / Upcoming
 * (LANDING_PAGE_STORY §7.7). Calm strip, not a roadmap manifesto.
 */
export function PlatformProgress() {
  return (
    <section id="progress" className="relative pt-5 pb-22">
      <div className="wrap relative">
        <SectionHead title={PLATFORM_PROGRESS.title}>
          {PLATFORM_PROGRESS.sub}
        </SectionHead>

        <Reveal className="mx-auto mb-8 flex max-w-[720px] flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {PLATFORM_PROGRESS.legend.map((entry) => (
            <span
              key={entry.status}
              className="stagger-child flex items-center gap-2 text-[.88rem] text-ink-soft"
            >
              <span
                className={cx(
                  "size-1.5 shrink-0 rounded-full",
                  STATUS_DOT[entry.status],
                )}
                aria-hidden="true"
              />
              {entry.label}
            </span>
          ))}
        </Reveal>

        <Reveal className="mx-auto max-w-[900px]" delay={60}>
          <ul className="grid grid-cols-1 gap-2.5 min-[520px]:grid-cols-2 min-[900px]:grid-cols-3">
            {PLATFORM_PROGRESS.items.map((item, i) => (
              <li
                key={item.id}
                className={cx(
                  "stagger-child flex flex-col gap-1 rounded-[12px] border px-3.5 py-3",
                  tileFor(item),
                )}
                style={{ ["--i" as string]: i }}
              >
                <span className="flex items-center gap-2.5 text-[.92rem] font-semibold text-balance">
                  <span
                    className={cx("size-1.5 shrink-0 rounded-full", dotFor(item))}
                    aria-hidden="true"
                  />
                  {item.name}
                </span>
                <span className="pl-4 text-[.8rem] opacity-80">{item.note}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-10 text-center" delay={120}>
          <Link
            href="/roadmap"
            className="text-[.98rem] font-bold text-honey-deep no-underline underline-offset-[3px] hover:underline"
          >
            {ROADMAP.title} →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
