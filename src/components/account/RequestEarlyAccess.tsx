"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { ChoiceChipsMulti } from "@/components/ui/ChoiceChips";
import { ApiCallFailed, requestEarlyAccess } from "@/lib/firebase/api";
import { MOBILE_PLATFORMS, type MobilePlatform } from "@/lib/account/model";

/**
 * The first thing you see once you have an account.
 *
 * Asking is its own act. Registration used to imply it, which meant anybody who
 * made an account was in the queue whether they meant to be or not — and a
 * queue you did not know you joined is not a queue you can be told about honestly.
 *
 * The phone question lives here rather than on the signup form because it only
 * means anything once you are asking: early access enrols people in mobile
 * testing, so this is where the track gets chosen.
 */
export function RequestEarlyAccess() {
  const { refresh } = useAuth();
  const [platforms, setPlatforms] = useState<MobilePlatform[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (platforms.length === 0) {
      setError("Pick at least one — you can change it later.");
      return;
    }

    setSaving(true);
    try {
      await requestEarlyAccess({ mobilePlatforms: platforms });
      await refresh();
    } catch (e) {
      setSaving(false);
      setError(
        e instanceof ApiCallFailed
          ? e.message
          : "That didn’t go through. Try again in a moment?",
      );
    }
  };

  return (
    <>
      <PageHeader eyebrow="Early access" title="Ask for your workspace">
        Your account is ready. Allr itself is still opening in batches — put your
        name down and we will email you when yours is up.
      </PageHeader>

      <form
        onSubmit={submit}
        className="rounded-card border border-line bg-card p-6 shadow-soft"
      >
        <h2 className="mb-1 font-serif text-[1.2rem] text-ink">
          Which phone do you use?
        </h2>
        <p className="mb-4 max-w-[52ch] text-[.96rem] leading-[1.7] text-ink-soft">
          iOS and Android are both open to testers, and early access puts you in
          the testing build automatically. Pick both if you use both.
        </p>

        <ChoiceChipsMulti
          legend="Which phone do you use?"
          options={MOBILE_PLATFORMS}
          values={platforms}
          onChange={(v) => {
            setError(null);
            setPlatforms(v as MobilePlatform[]);
          }}
        />

        {error && (
          <p role="alert" className="mt-3 text-[.88rem] font-semibold text-alert">
            {error}
          </p>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <Button type="submit" size="lg" disabled={saving} busy={saving}>
            {saving ? "Putting your name down…" : "Request early access"}
          </Button>
          <p className="mt-3 text-[.86rem] text-ink-soft">
            When your workspace opens, you get a free week with $5 of AI credit.
            We will email you the full terms.
          </p>
        </div>
      </form>
    </>
  );
}
