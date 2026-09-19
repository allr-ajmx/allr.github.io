"use client";

import { cx } from "@/lib/cx";

/**
 * How much of the promotional credit is left.
 *
 * Honey, not green: green means done or live (DESIGN.md §5), and a bar filling
 * up as you spend is neither. Honey is warmth and in-progress, which is exactly
 * what this is. It does not turn red near the end — `alert` may only say that
 * something the person typed needs fixing, and spending your own credit is not
 * a mistake to be corrected.
 *
 * The numbers come from `GET /api/account/credits`, which is honest about being
 * partly mocked: the grant and the window are real, the amount *used* is not
 * metered yet and reads zero.
 */
export function CreditBar({
  grantedUsd,
  usedUsd,
  daysLeft,
  mocked,
}: {
  grantedUsd: number;
  usedUsd: number;
  daysLeft: number;
  mocked?: boolean;
}) {
  const used = Math.max(0, Math.min(usedUsd, grantedUsd));
  const remaining = grantedUsd - used;
  // A sliver of colour at 0% reads as broken, so an untouched bar shows none.
  const pct = grantedUsd > 0 ? (used / grantedUsd) * 100 : 0;

  const money = (n: number) =>
    `$${n.toFixed(2).replace(/\.00$/, "")}`;

  return (
    <section className="rounded-card border border-line bg-card p-6 shadow-soft">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-[1.2rem] text-ink">Your free credit</h2>
        <p className="text-[.88rem] font-bold text-ink-soft">
          {daysLeft > 0
            ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
            : "Your free week has ended"}
        </p>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-line-soft"
        role="img"
        aria-label={`${money(used)} of ${money(grantedUsd)} used`}
      >
        <div
          className={cx("h-full rounded-full bg-honey transition-[width] duration-500")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-[.98rem] leading-[1.6] text-ink-soft">
        <span className="font-bold text-ink">{money(remaining)}</span> of{" "}
        {money(grantedUsd)} left for AI.
      </p>

      {mocked && (
        <p className="mt-3 rounded-chip border border-honey-line bg-honey-tint px-3 py-2 text-[.82rem] font-semibold text-honey-deep">
          Usage isn’t metered yet, so this reads zero. The week and the amount
          are real.
        </p>
      )}
    </section>
  );
}
