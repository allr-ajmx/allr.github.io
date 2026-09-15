"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AmbientShader } from "@/components/AmbientShader";
import { Reveal } from "@/components/Reveal";
import { AllrMark } from "@/components/ui/AllrMark";
import { AUTH_CONFIGURED } from "@/lib/firebase/env";
import {
  SignInBlocked,
  SignInDismissed,
  SignInNotEnabled,
  onUser,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { WORDMARK } from "@/lib/brand";
import { cx } from "@/lib/cx";

/**
 * Sign in.
 *
 * One button, because there is one provider (DESIGN.md §16): no password to
 * store, no second identity to reconcile, and an email address Google has
 * already verified — which is what the Firestore rules check against the token
 * rather than trusting anything typed into a form.
 *
 * This page keeps the shader. It is still a welcome surface; the shell behind
 * it is not.
 */

type Status = "idle" | "checking" | "signing" | "done";

export function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  // Someone who is already signed in has no business looking at a sign-in
  // page — send them on before they click anything.
  useEffect(() => {
    let live = true;
    const unsubscribe = onUser((user) => {
      if (!live) return;
      if (user) {
        setStatus("done");
        router.replace("/account/");
      } else {
        setStatus("idle");
      }
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, [router]);

  const start = async () => {
    setError(null);
    setStatus("signing");
    try {
      await signInWithGoogle();
      setStatus("done");
      // The shell decides where next: straight in, or through registration.
      router.replace("/account/");
    } catch (e) {
      if (e instanceof SignInDismissed) {
        setStatus("idle");
        return;
      }
      if (e instanceof SignInBlocked) {
        setStatus("idle");
        setError(
          "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
        );
        return;
      }
      if (e instanceof SignInNotEnabled) {
        // Not something the visitor can fix by trying again.
        setStatus("idle");
        setError("Sign-in isn’t switched on yet. That one is on us — try again later.");
        return;
      }
      setStatus("idle");
      setError("That didn’t go through. Try again in a moment?");
    }
  };

  const busy = status === "signing" || status === "done";

  return (
    <>
      <AmbientShader />
      <main className="grid min-h-dvh place-items-center px-6 py-16">
        <Reveal className="w-full max-w-[420px]" variant="blur">
          <div className="rounded-panel border border-line bg-card p-8 shadow-soft">
            <Link
              href="/"
              className="mb-7 inline-flex items-center gap-2 font-serif text-[1.5rem] text-ink no-underline transition-opacity duration-200 hover:opacity-80"
            >
              <AllrMark size={34} />
              {WORDMARK}
            </Link>

            <h1 className="mb-7 font-serif text-[1.7rem] leading-[1.18] text-ink">
              Sign in
            </h1>

            {!AUTH_CONFIGURED ? (
              <p
                role="status"
                className="rounded-card border border-honey-line bg-honey-tint px-4 py-3 text-[.92rem] font-semibold text-honey-deep"
              >
                Sign-in isn’t switched on in this build yet.
              </p>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={busy}
                className={cx(
                  "flex w-full items-center justify-center gap-3 rounded-control border border-line bg-card px-5 py-3 text-[1rem] font-bold text-ink transition-[transform,border-color,background-color] duration-150",
                  busy
                    ? "cursor-wait opacity-80"
                    : "cursor-pointer hover:-translate-y-0.5 hover:border-[#D8CFBB] hover:bg-paper",
                )}
              >
                <GoogleGlyph />
                {status === "signing"
                  ? "Waiting for Google…"
                  : status === "done"
                    ? "Signing you in…"
                    : "Continue with Google"}
              </button>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 text-[.9rem] font-semibold text-alert"
              >
                {error}
              </p>
            )}

            <p className="mt-7 border-t border-line pt-5 text-[.86rem] leading-[1.6] text-ink-soft">
              By continuing you agree to our{" "}
              <Link href="/terms/" className="font-bold text-ink underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy/" className="font-bold text-ink underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </Reveal>
      </main>
    </>
  );
}

/** Google's mark, in its own colours — the one place brand hues are not ours. */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[1.15rem] shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
