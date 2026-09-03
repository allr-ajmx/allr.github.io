"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { CTA, WAITLIST_DONE, WAITLIST_ERRORS } from "@/lib/brand";
import { cx } from "@/lib/cx";
import {
  AlreadyOnList,
  detectMobilePlatform,
  joinList,
  ListUnavailable,
  type ListId,
  type Platform,
} from "@/lib/waitlist";

type Variant = "inline" | "onGreen";

/** The device never changes during a session, so there is nothing to watch. */
const noopSubscribe = () => () => {};

export type PlatformOption = { id: Platform; label: string };

export function WaitlistForm({
  variant = "inline",
  id,
  list = "early",
  platforms,
  platformLegend,
  submitLabel = CTA.primary,
  done,
}: {
  variant?: Variant;
  id?: string;
  /** Which list this form joins. */
  list?: ListId;
  /** Show a platform chooser and record the choice with the signup. */
  platforms?: readonly PlatformOption[];
  platformLegend?: string;
  submitLabel?: string;
  /** Overrides the confirmation copy. Defaults to WAITLIST_DONE. */
  done?: { headline: string; sub: string };
}) {
  const [email, setEmail] = useState("");
  // Only set once someone taps a chip. Until then the device decides, so an
  // iPhone is never filed as Android just because Android is the first chip.
  const [chosen, setChosen] = useState<Platform | undefined>(undefined);

  // Reading `navigator` is browser-only, so it goes through
  // useSyncExternalStore rather than an effect: the server snapshot is
  // undefined, which keeps the prerendered markup and the first client render
  // identical. Same pattern as DownloadRow.
  const detected = useSyncExternalStore(
    noopSubscribe,
    () => detectMobilePlatform(),
    () => undefined,
  );

  const offers = (id: Platform | undefined) =>
    Boolean(id && platforms?.some((option) => option.id === id));

  // Explicit tap wins; then the detected device; then the neutral option, which
  // is what the server rendered.
  const platform =
    chosen ??
    (offers(detected) ? detected : undefined) ??
    (offers("either") ? "either" : platforms?.[0]?.id);
  const [status, setStatus] = useState<
    "idle" | "sending" | "ok" | "dup" | "err" | "unavailable"
  >("idle");
  const [shared, setShared] = useState(false);

  const onGreen = variant === "onGreen";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !value.includes("@")) {
      setStatus("err");
      return;
    }
    setStatus("sending");
    try {
      // The overloads keep the mobile beta from posting without a platform.
      if (list === "beta") {
        await joinList("beta", { email: value, platform: platform ?? "either" });
      } else {
        await joinList("early", { email: value });
      }
      setStatus("ok");
    } catch (e) {
      if (e instanceof AlreadyOnList) setStatus("dup");
      else if (e instanceof ListUnavailable) setStatus("unavailable");
      else setStatus("err");
    }
  }

  async function share() {
    const url = `${location.origin}${location.pathname}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Allr", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {
      // Dismissed share sheet or clipboard refused — nothing to recover.
    }
  }

  if (status === "ok" || status === "dup") {
    return (
      <div
        className={cx(
          "ticket relative w-full max-w-[520px] rounded-card border px-6 py-5 text-left",
          onGreen
            ? "live-glow--on-green mx-auto border-white/70 bg-white/10 text-white"
            : "live-glow bg-card text-ink shadow-soft",
        )}
        role="status"
      >
        <p className="font-serif text-[1.25rem]">
          {status === "dup"
            ? WAITLIST_DONE.already
            : (done?.headline ?? WAITLIST_DONE.headline)}
        </p>
        <p
          className={cx(
            "mt-1 truncate font-mono text-[.85rem]",
            onGreen ? "text-white/85" : "text-ink-soft",
          )}
        >
          {email.trim().toLowerCase()}
        </p>
        <p
          className={cx(
            "mt-2 text-[.95rem]",
            onGreen ? "text-white/90" : "text-ink-soft",
          )}
        >
          {done?.sub ?? WAITLIST_DONE.sub}
        </p>
        <button
          type="button"
          onClick={share}
          className={cx(
            "mt-3 cursor-pointer text-[.9rem] font-bold underline underline-offset-[3px]",
            onGreen ? "text-white" : "text-honey-deep",
          )}
        >
          {shared ? WAITLIST_DONE.copied : WAITLIST_DONE.share}
        </button>
      </div>
    );
  }

  const row = (
    <>
      <label className="sr-only" htmlFor={id ? `${id}-email` : "waitlist-email"}>
        Email
      </label>
      <input
        id={id ? `${id}-email` : "waitlist-email"}
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="you@studio.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "err" || status === "unavailable") setStatus("idle");
        }}
        className={cx(
          "allr-field min-w-0 flex-1",
          onGreen && "allr-field--on-green",
        )}
      />
      <Button
        type="submit"
        variant={onGreen ? "white" : "green"}
        size={onGreen ? "lg" : "md"}
        disabled={status === "sending"}
        className="shrink-0"
      >
        {status === "sending" ? "Joining\u2026" : submitLabel}
      </Button>
      {status === "err" || status === "unavailable" ? (
        <p
          className={cx(
            "sm:absolute sm:top-full sm:mt-2 text-[.88rem] font-semibold",
            onGreen ? "text-white/90" : "text-[#A6543C]",
          )}
          role="alert"
        >
          {status === "unavailable"
            ? WAITLIST_ERRORS.unavailable
            : WAITLIST_ERRORS.invalid}
        </p>
      ) : null}
    </>
  );

  // With a platform chooser the row needs a column above it; without one the
  // markup stays exactly as the homepage has always rendered it.
  if (platforms?.length) {
    return (
      <form
        id={id}
        onSubmit={onSubmit}
        className={cx(
          "mx-auto flex w-full max-w-[520px] flex-col items-center gap-3.5",
        )}
      >
        <div className="relative flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
          {row}
        </div>
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">{platformLegend ?? "Platform"}</legend>
          {platforms.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setChosen(option.id)}
              aria-pressed={platform === option.id}
              className={cx(
                "cursor-pointer rounded-chip border px-3.5 py-1.5 text-[.85rem] font-bold transition-colors duration-200",
                platform === option.id
                  ? onGreen
                    ? "border-white/45 bg-white/20 text-white"
                    : "border-green-line bg-green-tint text-green-deep"
                  : onGreen
                    ? "border-white/20 text-white/75 hover:border-white/35 hover:text-white"
                    : "border-line text-ink-soft hover:border-[#D8CFBB] hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
      </form>
    );
  }

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className={cx(
        "relative mx-auto flex w-full max-w-[520px] flex-col gap-2.5 sm:flex-row sm:items-center",
      )}
    >
      {row}
    </form>
  );
}
