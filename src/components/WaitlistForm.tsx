"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CTA, WAITLIST_DONE } from "@/lib/brand";
import { cx } from "@/lib/cx";

type Variant = "inline" | "onGreen";

const WAITLIST_URL = process.env.NEXT_PUBLIC_WAITLIST_URL;
const WAITLIST_EMAIL = process.env.NEXT_PUBLIC_WAITLIST_EMAIL;

async function submitEmail(email: string) {
  if (WAITLIST_URL) {
    const res = await fetch(WAITLIST_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, source: "allr.github.io" }),
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
}: {
  variant?: Variant;
  id?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
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
      await submitEmail(value);
      setStatus("ok");
    } catch {
      setStatus("err");
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

  if (status === "ok") {
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
        <p className="font-serif text-[1.25rem]">{WAITLIST_DONE.headline}</p>
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
          {WAITLIST_DONE.sub}
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

  return (
    <form
      id={id}
      onSubmit={onSubmit}
      className={cx(
        "relative flex w-full max-w-[520px] flex-col gap-2.5 sm:flex-row sm:items-center",
        onGreen && "mx-auto",
      )}
    >
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
        {status === "sending" ? "Joining…" : CTA.primary}
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
    </form>
  );
}
