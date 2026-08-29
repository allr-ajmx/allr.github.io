"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CTA, WAITLIST_DONE } from "@/lib/brand";
import { cx } from "@/lib/cx";

type Variant = "inline" | "onGreen";

/** Firestore collection to create in. Each has its own rule block. */
type Collection = "waitlist" | "beta_signups";

export type PlatformOption = { id: string; label: string };

const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const WAITLIST_URL = process.env.NEXT_PUBLIC_WAITLIST_URL;
const WAITLIST_EMAIL = process.env.NEXT_PUBLIC_WAITLIST_EMAIL;

/** Thrown when the address is already on the list. */
export class AlreadyOnList extends Error {}

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Which deployment the signup came from, e.g. "https://allr.work". */
const source = () => (typeof location !== "undefined" ? location.origin : "unknown").slice(0, 64);

async function submitEmail(
  email: string,
  collection: Collection,
  platform?: string,
) {
  // 1. Firestore, straight from the browser. Rules allow create only; the
  //    document id is the hash of the email so duplicates are refused (409).
  //    Each collection has its own id space, so someone already on the main
  //    waitlist can still join the mobile beta.
  if (FIREBASE_PROJECT_ID && FIREBASE_API_KEY) {
    const id = await sha256Hex(email);
    const url =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
      `/databases/(default)/documents/${collection}?documentId=${id}&key=${FIREBASE_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          source: { stringValue: source() },
          userAgent: { stringValue: navigator.userAgent.slice(0, 512) },
          createdAt: { timestampValue: new Date().toISOString() },
          ...(platform ? { platform: { stringValue: platform } } : {}),
        },
      }),
    });
    if (res.status === 409) throw new AlreadyOnList();
    if (!res.ok) throw new Error("waitlist");
    return;
  }

  if (WAITLIST_URL) {
    const res = await fetch(WAITLIST_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, source: source(), platform }),
    });
    if (!res.ok) throw new Error("waitlist");
    return;
  }

  if (WAITLIST_EMAIL) {
    const res = await fetch(`https://formsubmit.co/ajax/${WAITLIST_EMAIL}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        _subject: "Allr early access",
      }),
    });
    if (!res.ok) throw new Error("waitlist");
    return;
  }

  const key = "allr.waitlist";
  const prev: { email: string; at: number }[] = JSON.parse(
    localStorage.getItem(key) || "[]",
  );
  localStorage.setItem(
    key,
    JSON.stringify([...prev, { email, at: Date.now() }]),
  );
}

export function WaitlistForm({
  variant = "inline",
  id,
  collection = "waitlist",
  platforms,
  platformLegend,
  submitLabel = CTA.primary,
  done,
}: {
  variant?: Variant;
  id?: string;
  /** Which list this form joins. */
  collection?: Collection;
  /** Show a platform chooser and record the choice with the signup. */
  platforms?: readonly PlatformOption[];
  platformLegend?: string;
  submitLabel?: string;
  /** Overrides the confirmation copy. Defaults to WAITLIST_DONE. */
  done?: { headline: string; sub: string };
}) {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState(platforms?.[0]?.id);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "dup" | "err">(
    "idle",
  );
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
      await submitEmail(value, collection, platform);
      setStatus("ok");
    } catch (e) {
      setStatus(e instanceof AlreadyOnList ? "dup" : "err");
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
          if (status === "err") setStatus("idle");
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
      {status === "err" ? (
        <p
          className={cx(
            "sm:absolute sm:top-full sm:mt-2 text-[.88rem] font-semibold",
            onGreen ? "text-white/90" : "text-[#A6543C]",
          )}
          role="alert"
        >
          Try that email again?
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
          "flex w-full max-w-[520px] flex-col items-center gap-3.5",
          onGreen && "mx-auto",
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
              onClick={() => setPlatform(option.id)}
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
        "relative flex w-full max-w-[520px] flex-col gap-2.5 sm:flex-row sm:items-center",
        onGreen && "mx-auto",
      )}
    >
      {row}
    </form>
  );
}
