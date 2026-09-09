"use client";

import { useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/Button";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { COUNTRIES, countryName } from "@/lib/countries";
import { MINIMUM_AGE } from "@/lib/legal";
import {
  birthDateInputValue,
  latestEligibleBirthDate,
  saveProfile,
  validateDraft,
  type AccountType,
  type DraftErrors,
  type ProfileDraft,
} from "@/lib/firebase/profile";

/**
 * Read and correct what we hold.
 *
 * Email is shown but not editable: it comes from Google and the Firestore rules
 * pin it to the auth token, so a field here would be a lie. Date of birth *is*
 * editable — a typo should not need a support desk — but only ever to another
 * date that still passes the age check, which the rules enforce as well.
 */

const ACCOUNT_TYPES: readonly { id: AccountType; label: string }[] = [
  { id: "individual", label: "Just me" },
  { id: "business", label: "A business" },
];

type Status = "idle" | "saving" | "saved" | "error";

export function ProfilePage() {
  const { user, profile, refresh } = useAuth();

  const initial: ProfileDraft | null = useMemo(
    () =>
      profile
        ? {
            legalName: profile.legalName,
            dateOfBirth: birthDateInputValue(profile.dateOfBirth),
            country: profile.country,
            accountType: profile.accountType,
            entityName: profile.entityName,
            marketingOptIn: profile.marketingOptIn,
          }
        : null,
    [profile],
  );

  const [draft, setDraft] = useState<ProfileDraft | null>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

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
    if (Object.keys(validateDraft(current)).length > 0) return;
    if (!user) return;

    setStatus("saving");
    try {
      await saveProfile(user.uid, current);
      await refresh();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <PageHeader eyebrow="Profile" title="Your details">
        What we hold about you, and nothing more. We will ask for a billing
        address when there is something to bill.
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

        <Field label="Legal name" error={errors.legalName} required>
          {(props) => (
            <input
              {...props}
              type="text"
              autoComplete="name"
              className="allr-field allr-field--dense"
              value={current.legalName}
              onChange={(e) => set("legalName", e.currentTarget.value)}
            />
          )}
        </Field>

        <Field
          label="Date of birth"
          hint={`Correctable, but it has to stay ${MINIMUM_AGE} or over.`}
          error={errors.dateOfBirth}
          required
        >
          {(props) => (
            <input
              {...props}
              type="date"
              autoComplete="bday"
              max={latestEligibleBirthDate()}
              className="allr-field allr-field--dense"
              value={current.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.currentTarget.value)}
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
          <p className="text-[.92rem] font-bold text-ink">
            Who is this account for?
          </p>
          <ChoiceChips
            legend="Who is this account for?"
            options={ACCOUNT_TYPES}
            value={current.accountType}
            onChange={(id) => set("accountType", id)}
          />
        </div>

        {current.accountType === "business" && (
          <Field
            label="Registered business name"
            error={errors.entityName}
            required
          >
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="organization"
                className="allr-field allr-field--dense"
                value={current.entityName}
                onChange={(e) => set("entityName", e.currentTarget.value)}
              />
            )}
          </Field>
        )}

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
              That didn’t save. Try again?
            </p>
          )}
        </div>
      </form>
    </>
  );
}
