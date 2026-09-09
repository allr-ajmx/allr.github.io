import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { MINIMUM_AGE, TERMS_UPDATED, TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The agreement between you and Allr: who may hold an account, what you can expect, and what we expect back.",
};

const SECTIONS: readonly LegalSection[] = [
  {
    heading: "Who this agreement is between",
    intent:
      "The legal entity you are contracting with, and that using Allr means accepting these terms.",
  },
  {
    heading: `You have to be ${MINIMUM_AGE} or over`,
    intent: `That Allr is strictly for people of contract age, that we check the date of birth you give at registration, and what happens if it turns out to be wrong.`,
  },
  {
    heading: "Your account",
    intent:
      "That sign-in is through Google only, that the account is yours and not to be shared, and what you are responsible for keeping safe.",
  },
  {
    heading: "The app and the workspace are two things",
    intent:
      "The Allr app is free and stays free; the agent workspace is a separate, paid product. Which of these terms apply to which.",
  },
  {
    heading: "What you make with Allr",
    intent:
      "Who owns the work — you do — what licence we need to host and publish it for you, and what we will never do with it.",
  },
  {
    heading: "What you may not do with it",
    intent:
      "The short, specific list: nothing unlawful, nothing that attacks the service or another person, nothing that resells it as your own.",
  },
  {
    heading: "Paying for the workspace",
    intent:
      "Plans, renewals, taxes, refunds and what happens when a payment fails. Written once there is something to buy.",
  },
  {
    heading: "Availability, and what we do not promise",
    intent:
      "What we aim for, what a beta means, and the limits on our liability — in plain language, not in capitals.",
  },
  {
    heading: "Ending it",
    intent:
      "How you close your account, when we might suspend one, and what happens to your work afterwards.",
  },
  {
    heading: "Changes, law and disputes",
    intent:
      "How we tell you when these terms change, which country's law applies, and where a disagreement gets settled.",
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="The agreement between you and Allr — who may hold an account, what you can expect from us, and what we expect back."
      version={TERMS_VERSION}
      updated={TERMS_UPDATED}
      sections={SECTIONS}
    />
  );
}
