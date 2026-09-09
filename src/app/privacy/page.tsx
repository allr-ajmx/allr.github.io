import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { MINIMUM_AGE, PRIVACY_UPDATED, PRIVACY_VERSION } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Allr collects, why, how long we keep it, and what you can ask us to do with it.",
};

/**
 * The questions this policy has to answer. The answers are yours to write.
 *
 * The list is not arbitrary: each one maps to something the site already does
 * or already stores, so nothing here is speculative scaffolding.
 */
const SECTIONS: readonly LegalSection[] = [
  {
    heading: "Who we are",
    intent:
      "The legal entity behind Allr, where it is registered, and how to reach the person responsible for data protection.",
  },
  {
    heading: "What we collect, and when",
    intent:
      "Three moments, and only three: an email address when you join a waitlist; your Google profile and the registration details when you create an account; and billing details at checkout. Each one names the fields exactly.",
  },
  {
    heading: "Why we collect it",
    intent:
      "The lawful basis for each of those, separately — contract for the account details, consent for marketing email, legitimate interest for anything else.",
  },
  {
    heading: "Your date of birth",
    intent: `Why we ask for it at registration rather than later, that Allr is only for people ${MINIMUM_AGE} and over, and that we keep the date because it is the evidence the age check rests on.`,
  },
  {
    heading: "Google sign-in",
    intent:
      "That Google is the only way in, what Google tells us (name, email, profile picture), and what it does not.",
  },
  {
    heading: "Who else sees it",
    intent:
      "Every processor by name — Google for sign-in and Firebase for storage, plus a payment processor once there is one — and where each of them holds the data.",
  },
  {
    heading: "How long we keep it",
    intent:
      "A retention period per category, and what happens to each when you close your account.",
  },
  {
    heading: "Your rights",
    intent:
      "Access, correction, deletion, portability, objection, and withdrawing consent — with how to exercise each and how quickly we answer.",
  },
  {
    heading: "Cookies and local storage",
    intent:
      "What the site stores in your browser, which of it is strictly necessary for keeping you signed in, and what we do not use.",
  },
  {
    heading: "Transfers, security and changes",
    intent:
      "Where data crosses borders and under what safeguards, how it is protected, and how we tell you when this policy changes materially.",
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What we collect, why we collect it, and what you can tell us to do with it."
      version={PRIVACY_VERSION}
      updated={PRIVACY_UPDATED}
      sections={SECTIONS}
    />
  );
}
