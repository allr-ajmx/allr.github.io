"use client";

import { useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { COUNTRIES, countryName } from "@/lib/countries";
import { ApiCallFailed, patchProfile } from "@/lib/firebase/api";
import {
  MOBILE_PLATFORMS,
  type MobilePlatform,
  type ProfileDraft,
} from "@/lib/account/model";
import { validateDraft, type DraftErrors } from "@/lib/account/validate";
import { ChoiceChipsMulti } from "@/components/ui/ChoiceChips";

/**
 * Read and correct what we hold.
 *
 * Email is shown but not editable: it comes from Google and the Firestore rules
 * pin it to the auth token, so a field here would be a lie. Age is declared once
 * at registration and is not editable afterwards.
 *
 * Accounts are individual only; there is no business signup to edit.
 */

type Status = "idle" | "saving" | "saved" | "error";

export function ProfilePage() {
  const { user, profile, refresh } = useAuth();

  const initial: ProfileDraft | null = useMemo(
    () =>
      profile
        ? {
            name: profile.name,
            confirmedOver18: profile.confirmedOver18,
            country: profile.country,
            accountType: "individual",
            entityName: "",
            marketingOptIn: profile.marketingOptIn,
          }
        : null,
    [profile],
  );

  const [draft, setDraft] = useState<ProfileDraft | null>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<string | null>(null);

  // Tester tracks save on their own: they are a toggle, not part of the form
  // you submit, and making somebody press Save to change one would be odd.
  const savePlatforms = async (next: MobilePlatform[]) => {
    try {
      await patchProfile({ mobilePlatforms: next });
      await refresh();
    } catch {
      setStatus("error");
      setFailure("That didn’t save. Try again?");
    }
  };

  // The provider resolves the profile after this component first renders.
  const current = draft ?? initial;
  if (!current || !profile) {
    return (
      <>
        <PageHeader eyebrow="Profile" title="Your details" />
        <p className="text-ink-soft">Loading your details…</p>
      </>
    );
  }

  const errors: DraftErrors = submitted ? validateDraft(current) : {};
  const dirty =
    initial !== null &&
    (Object.keys(initial) as (keyof ProfileDraft)[]).some(
      (k) => initial[k] !== current[k],
    );

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setStatus("idle");
    setDraft({ ...current, [key]: value });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!dirty) return;
    const payload: ProfileDraft = {
      ...current,
      accountType: "individual",
      entityName: "",
    };
    if (Object.keys(validateDraft(payload)).length > 0) return;
    if (!user) return;

    setStatus("saving");
    try {
      await patchProfile(payload);
      await refresh();
      setStatus("saved");
    } catch (error) {
      setStatus("error");
      setFailure(
        error instanceof ApiCallFailed
          ? error.message
          : "That didn’t save. Try again?",
      );
    }
  };

  return (
    <>
      <PageHeader eyebrow="Profile" title="Your details">
        The details you gave us, which you can correct here. We will ask for a
        billing address when there is something to bill.
      </PageHeader>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="rounded-card border border-line bg-card p-5">
          <p className="text-[.86rem] font-bold tracking-[0.04em] text-ink-soft uppercase">
            Signed in with Google
          </p>
          <p className="mt-1 text-[1rem] font-bold text-ink">{user?.email}</p>
          <p className="mt-1 text-[.88rem] text-ink-soft">
            Your email comes from Google and cannot be changed here.
          </p>
        </div>

        <Field label="Name" error={errors.name} required>
          {(props) => (
            <input
              {...props}
              type="text"
              autoComplete="name"
              className="allr-field allr-field--dense"
              value={current.name}
              onChange={(e) => set("name", e.currentTarget.value)}
            />
          )}
        </Field>

        <Field
          label="Country of residence"
          hint={`Currently ${countryName(profile.country)}.`}
          error={errors.country}
          required
        >
          {(props) => (
            <Select
              {...props}
              dense
              placeholder="Choose a country"
              autoComplete="country"
              value={current.country}
              onChange={(e) => set("country", e.currentTarget.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <p className="text-[.92rem] font-bold text-ink">Mobile testing</p>
          <p className="text-[.86rem] leading-snug text-ink-soft">
            Which phone builds you are enrolled in. Both is a real answer.
          </p>
          <ChoiceChipsMulti
            legend="Mobile testing"
            options={MOBILE_PLATFORMS}
            values={profile.mobilePlatforms}
            onChange={(v) => void savePlatforms(v as MobilePlatform[])}
          />
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Saving…" : "Save changes"}
          </Button>
          {status === "saved" && (
            <p role="status" className="text-[.9rem] font-bold text-green-deep">
              Saved.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="text-[.9rem] font-semibold text-alert">
              {failure ?? "That didn’t save. Try again?"}
            </p>
          )}
        </div>
      </form>
    </>
  );
}
