"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { signOutOfAllr } from "@/lib/firebase/auth";
import { patchProfile } from "@/lib/firebase/api";
import { CONTACT_EMAIL, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";

type Status = "idle" | "saving" | "error";

export function SettingsPage() {
  const { user, profile, refresh } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  const setMarketing = async (next: boolean) => {
    if (!user) return;
    setStatus("saving");
    try {
      await patchProfile({ marketingOptIn: next });
      await refresh();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const signOut = async () => {
    await signOutOfAllr();
    router.replace("/login/");
  };

  return (
    <>
      <PageHeader eyebrow="Settings" title="Account settings" />

      <section className="mb-8 rounded-card border border-line bg-card p-6">
        <h2 className="mb-4 font-serif text-[1.2rem] text-ink">Email</h2>
        <Checkbox
          checked={profile?.marketingOptIn ?? false}
          onChange={(v) => void setMarketing(v)}
          label="Send me the occasional email about what Allr can do."
          hint={
            status === "error"
              ? undefined
              : "Turn this off and on whenever you like — it never affects the emails we have to send you about your account."
          }
          error={status === "error" ? "That didn’t save. Try again?" : undefined}
        />
      </section>

      <section className="mb-8 rounded-card border border-line bg-card p-6">
        <h2 className="mb-2 font-serif text-[1.2rem] text-ink">What you agreed to</h2>
        <p className="mb-4 text-[.96rem] leading-[1.7] text-ink-soft">
          You accepted the{" "}
          <Link href="/terms/" className="font-bold text-ink underline">
            Terms of Use
          </Link>{" "}
          ({profile?.termsVersion ?? TERMS_VERSION}) and the{" "}
          <Link href="/privacy/" className="font-bold text-ink underline">
            Privacy Policy
          </Link>{" "}
          ({profile?.privacyVersion ?? PRIVACY_VERSION}) when you registered. If
          either changes materially, we will ask you again rather than assume.
        </p>
      </section>

      <section className="mb-8 rounded-card border border-line bg-card p-6">
        <h2 className="mb-2 font-serif text-[1.2rem] text-ink">Closing your account</h2>
        <p className="mb-4 text-[.96rem] leading-[1.7] text-ink-soft">
          Write to us and we will delete your account and everything we hold
          about you. There is no button for it yet, because a button that half
          worked would be worse than none.
        </p>
        <Button href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20account`} variant="ghost">
          Ask us to delete it
        </Button>
      </section>

      <section className="rounded-card border border-line bg-card p-6">
        <h2 className="mb-4 font-serif text-[1.2rem] text-ink">This device</h2>
        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer rounded-control border border-line bg-card px-5 py-2.5 text-[.98rem] font-bold text-ink transition-colors duration-150 hover:border-[#D8CFBB] hover:bg-paper"
        >
          Sign out
        </button>
      </section>
    </>
  );
}
