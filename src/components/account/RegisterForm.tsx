"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { AllrMark } from "@/components/ui/AllrMark";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ChoiceChips } from "@/components/ui/ChoiceChips";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { COUNTRIES } from "@/lib/countries";
import {
  createProfile,
  latestEligibleBirthDate,
  validateDraft,
  type AccountType,
  type DraftErrors,
  type ProfileDraft,
} from "@/lib/firebase/profile";
import { WORDMARK } from "@/lib/brand";

/**
 * Registration — the one thing between a Google account and an Allr account.
 *
 * What it asks for is the legal minimum needed to sell to this person later,
 * and nothing beyond it (DESIGN.md §16). Postal address and tax ID are checkout
 * questions: collecting them now would mean holding data we have no use for,
 * which is exactly what a privacy policy has to justify.
 *
 * Date of birth is here rather than at checkout because Allr is strictly an
 * above-contract-age product, and an age gate that only fires at the moment
 * money changes hands has already let someone build a workspace they were never
 * allowed to have.
 */

const ACCOUNT_TYPES: readonly { id: AccountType; label: string }[] = [
  { id: "individual", label: "Just me" },
  { id: "business", label: "A business" },
];

type Status = "idle" | "saving" | "error";

export function RegisterForm() {
  const { user, refresh } = useAuth();
  const router = useRouter();

  const [draft, setDraft] = useState<ProfileDraft>({
    legalName: user?.displayName ?? "",
    dateOfBirth: "",
    country: "",
    accountType: "individual",
    entityName: "",
    marketingOptIn: false,
  });
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  // Errors appear on submit, then track every keystroke — so the form never
  // scolds you for a field you have not reached yet, and never keeps scolding
  // you once you have fixed it.
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState<string | null>(null);

  const fieldErrors: DraftErrors = useMemo(
    () => (submitted ? validateDraft(draft) : {}),
    [draft, submitted],
  );
  const consentError = submitted && !(terms && privacy);

  // Recomputed per render rather than frozen at mount: a form left open across
  // midnight should not use yesterday's cut-off.
  const maxBirthDate = latestEligibleBirthDate();

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setFailure(null);

    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0 || !terms || !privacy) return;
    if (!user) return;

    setStatus("saving");
    try {
      await createProfile(user, draft);
      await refresh();
      router.replace("/account/");
    } catch {
      setStatus("error");
      // The rules are the second, non-negotiable check. If they refused, the
      // honest thing is to say so rather than pretend the account exists.
      setFailure(
        "We couldn’t save those details. Check them over and try again.",
      );
    }
  };

  const saving = status === "saving";
  // Consent is not a validation error to discover on submit — an account
  // cannot exist without it, so the button does not pretend otherwise. The
  // Firestore rules refuse the write too; this is only the polite half.
  const consented = terms && privacy;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 font-serif text-[1.4rem] text-ink no-underline transition-opacity duration-200 hover:opacity-80"
      >
        <AllrMark size={30} />
        {WORDMARK}
      </Link>

      <h1 className="mb-2 font-serif text-[1.85rem] leading-[1.18] text-ink">
        A few details, once
      </h1>
      <p className="mb-8 text-[1.02rem] leading-[1.7] text-ink-soft">
        We ask for these now so that nothing has to stop later. Signed in as{" "}
        <span className="font-bold text-ink">{user?.email}</span>.
      </p>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <Field label="Name" error={fieldErrors.legalName} required>
          {(props) => (
            <input
              {...props}
              type="text"
              autoComplete="name"
              className="allr-field"
              value={draft.legalName}
              onChange={(e) => set("legalName", e.currentTarget.value)}
            />
          )}
        </Field>

        <Field
          label="Date of birth"
          error={fieldErrors.dateOfBirth}
          required
        >
          {(props) => (
            <input
              {...props}
              type="date"
              autoComplete="bday"
              max={maxBirthDate}
              className="allr-field"
              value={draft.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.currentTarget.value)}
            />
          )}
        </Field>

        <Field label="Country of residence" error={fieldErrors.country} required>
          {(props) => (
            <Select
              {...props}
              placeholder="Choose a country"
              autoComplete="country"
              value={draft.country}
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
            value={draft.accountType}
            onChange={(id) => set("accountType", id)}
          />
        </div>

        {draft.accountType === "business" && (
          <Field
            label="Registered business name"
            hint="The name on the company register. Tax and VAT numbers come later, at checkout."
            error={fieldErrors.entityName}
            required
          >
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="organization"
                className="allr-field"
                value={draft.entityName}
                onChange={(e) => set("entityName", e.currentTarget.value)}
              />
            )}
          </Field>
        )}

        <div className="flex flex-col gap-4 border-t border-line pt-6">
          <Checkbox
            checked={terms}
            onChange={setTerms}
            error={
              consentError && !terms ? "Please accept the terms to continue." : undefined
            }
            label={
              <>
                I agree to the{" "}
                <Link href="/terms/" className="font-bold underline">
                  Terms of Use
                </Link>
                .
              </>
            }
          />
          <Checkbox
            checked={privacy}
            onChange={setPrivacy}
            error={
              consentError && !privacy
                ? "Please accept the privacy policy to continue."
                : undefined
            }
            label={
              <>
                I have read the{" "}
                <Link href="/privacy/" className="font-bold underline">
                  Privacy Policy
                </Link>
                .
              </>
            }
          />
          {/* Deliberately separate and unticked. Consent that is bundled with
              something you had to accept anyway is not consent. */}
          <Checkbox
            checked={draft.marketingOptIn}
            onChange={(v) => set("marketingOptIn", v)}
            label="Send me the occasional email about what Allr can do."
            hint="Optional, and you can turn it off whenever you like."
          />
        </div>

        {failure && (
          <p role="alert" className="text-[.9rem] font-semibold text-alert">
            {failure}
          </p>
        )}

        <div>
          <Button
            type="submit"
            size="lg"
            disabled={saving || !consented}
            busy={saving}
          >
            {saving ? "Setting things up…" : "Create my account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
