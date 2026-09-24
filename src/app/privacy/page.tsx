import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import {
  BILLING_ENTITY,
  CONTACT_EMAIL,
  LEGAL_OPERATOR,
  LEGAL_TRADING_AS,
  MINIMUM_AGE,
  PRIVACY_UPDATED,
  PRIVACY_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Allr collects, why, how long we keep it, and what you can ask us to do with it.",
};

const SECTIONS: readonly LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      `This Privacy Policy describes how ${LEGAL_OPERATOR}, trading as ${LEGAL_TRADING_AS} (“Allr”, “we”, “us”, or “our”), collects, uses, stores, and discloses personal data in connection with Allr. Allr is operated from India. ${LEGAL_OPERATOR} is the data controller (or equivalent) for personal data processed under this Policy until a successor legal entity assumes operation of Allr and publishes a replacement policy.`,
      `${BILLING_ENTITY} services billing and payment collection for Allr and processes payment-related personal data solely for that purpose. ${BILLING_ENTITY} is not the operator of Allr for the purposes of this Policy.`,
      `Requests relating to privacy, including access and deletion requests, may be sent to ${CONTACT_EMAIL}. This Policy applies to the Allr website, to your Allr account and the workspace data associated with it, and to the Allr applications for desktop, iOS, and Android. Information about using the applications, signing up, and billing is sent to you by email; the same Policy applies wherever you use Allr.`,
    ],
  },
  {
    heading: "Personal data we collect",
    body: [
      `Waitlist and mobile beta interest: the email address you enter and, where provided, the mobile platform you select. Alongside these, we record the date and time of the signup, the website address it was made from, and your browser’s user-agent string. You do not enter these details; they are recorded automatically when the form is submitted.`,
      `Account registration: personal data received from Google in connection with sign-in (typically name, email address, and profile photograph), together with information you submit at registration, including name, country, your confirmation that you are at least ${MINIMUM_AGE} years of age, marketing preference, and the versions of the Terms of Use and Privacy Policy you accept. When you request early access, we also record the time of your request and the mobile platforms you choose for testing.`,
      `Workspace: identifiers we assign (including workspace username, workspace email, and workspace address), plan or credit metadata displayed to you, and content you submit to or generate within the workspace, including prompts, files, memories, workflows, and published products. You reach your workspace by signing in with your Allr account. Our team can access workspaces to install updates and fix faults; when we do, we do not read the data in your workspace or the content you create.`,
      `AI traces: when you use an AI model through Allr, we record a trace of each request — including the prompt, the response, the model used, timing, and any errors — in a tracing system (Langfuse) that we host ourselves, so traces are not shared with a third party. We look at traces only to investigate an issue you are facing.`,
      `Payments: when checkout is available, billing information necessary to process payment, handled by ${BILLING_ENTITY} and any payment processors identified at checkout. We do not collect card details on interfaces that are not enabled for payment.`,
      `Device and log data: when you visit the website or use your account, our hosting provider records technical information such as your IP address, browser type, and the pages requested. We use it to deliver the website, keep it secure, and diagnose faults.`,
      `Allr applications: the applications are a gateway to your workspace, a personal remote operating system we host for you. They do not include analytics, crash reporting, or any other telemetry. Your sign-in credentials are stored encrypted in your device’s secure credential storage (such as the Keychain) and are used only to authenticate your requests. Content you send to an AI model is handled as described in the section titled “AI model providers”.`,
    ],
  },
  {
    heading: "Purposes of processing",
    body: [
      `We process account and workspace data to perform our contract with you: to authenticate you, operate the workspace, host and deploy your products, provide support, investigate issues you face, and administer your account.`,
      `We send marketing communications only where you have opted in. You may withdraw that consent at any time. We may send transactional messages concerning your account, early access, security, and billing without marketing consent where necessary to provide the service.`,
      `We do not use User Content to train machine-learning models unless you provide a separate, explicit opt-in.`,
    ],
  },
  {
    heading: "Age restriction",
    body: [
      `We ask you to confirm at registration that you are at least ${MINIMUM_AGE} years of age, which is a condition of using Allr. The confirmation is self-declared: we require the checkbox to be ticked, but we do not verify your age against identity documents. We retain the record of that confirmation. If you do not confirm that you meet the age requirement, registration will not be completed.`,
    ],
  },
  {
    heading: "Google sign-in",
    body: [
      `Allr accounts presently require authentication through Google. Google provides the profile fields you authorise for sign-in. We do not receive your Google password. Your use of Google services is additionally governed by Google’s terms and privacy policy.`,
    ],
  },
  {
    heading: "Processors and disclosures",
    body: [
      `We share personal data with the following service providers, only as needed to run Allr: Google (Firebase Authentication for sign-in, and Cloud Firestore for storing account, waitlist, and published-product records); Vercel (hosting the website and your account, including request logs); GitHub (hosting application releases, which receives your IP address when you download from it); Hostinger (email, for messages you send to ${CONTACT_EMAIL}); and ${BILLING_ENTITY} (collecting and processing payments).`,
      `We do not sell personal data. We do not use third-party advertising networks or analytics trackers on the marketing site or within the account interface.`,
      `We may disclose personal data where required by applicable law, or where necessary to protect the rights, safety, or property of Allr, our users, or others.`,
    ],
  },
  {
    heading: "AI model providers",
    body: [
      `Allr generates outputs by sending your prompts, files, and related context to an AI model. You choose the provider and model in the application, and you can change that choice at any time.`,
      `If you use the AI routing service we provide, your content passes through that service to the provider of the model you select, which is named in the application when you select it. We send only what is needed to generate the response, and we route your content only to providers whose terms protect it at least as strongly as this Policy.`,
      `If you add your own AI provider, your key is stored in your workspace, which you reach by signing in with your Allr account. As with a file on your own computer, the key is not separately encrypted, so keep your account secure. Your content is sent to that provider using your key, and that provider’s handling of it is governed by your agreement with that provider.`,
      `AI model providers process your content under their own terms and privacy policies. We do not use your content to train machine-learning models.`,
    ],
  },
  {
    heading: "Retention",
    body: [
      `Account data — including your profile, the record of your age confirmation, the record of the policy versions you accepted, and the record we keep to prevent duplicate accounts — is retained for as long as your account exists. AI traces are retained for as long as your account exists and are deleted with it.`,
      `Waitlist data is retained until you unsubscribe, request deletion, or we discontinue the relevant list. Server logs are retained for no longer than ninety (90) days.`,
      `If a promotional or unpaid early-access period ends without conversion to a paid plan, workspace data is retained for fourteen (14) days and then deleted.`,
      `If a paid licence ends, workspace data is retained for ninety (90) days and then deleted, unless you have requested a backup and/or enrolled in a paid data-persistence option where available.`,
      `If you ask us to delete your account, we delete everything we hold about you — your account, your workspace data, and the record we keep to prevent duplicate accounts — within ninety (90) days of your request, except records we are required by law to keep. If you do not ask, the retention periods above apply and deletion takes place automatically when they end.`,
    ],
  },
  {
    heading: "Your rights",
    body: [
      `Subject to applicable law, you may request access to, correction of, or deletion of personal data we hold about you, withdraw marketing consent, or raise questions about this Policy by contacting ${CONTACT_EMAIL}. You can also request deletion of your account from Settings in your Allr account on the website; the Allr applications link to it. We will endeavour to respond within thirty (30) days.`,
      `The scope of available rights may depend on your jurisdiction. We may request information reasonably necessary to verify your identity before fulfilling a request. If you are not satisfied with our response, you may complain to the data protection authority where you live, including, in India, the Data Protection Board of India.`,
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      `We use cookies and similar technologies only as necessary to authenticate you and operate the account interface (including session data for Google sign-in and strictly necessary preferences such as sidebar state). We do not use advertising cookies or third-party tracking pixels.`,
    ],
  },
  {
    heading: "International transfers, security, and changes",
    body: [
      `Allr is operated from India. Although early access is not presently directed at the European Union or the United Kingdom, authentication and hosting providers (including Google) may process personal data outside India. We implement reasonable technical and organisational measures to protect personal data; no method of transmission or storage is completely secure.`,
      `We may update this Policy from time to time. For material changes, we will revise the “Last updated” date and version identifier and, where your account records an accepted version, require renewed acceptance before continued use.`,
    ],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This Privacy Policy explains what personal data Allr collects, how it is used, how long it is retained, and the choices available to you. It applies to the Allr website, your Allr account, and the Allr applications for desktop, iOS, and Android."
      version={PRIVACY_VERSION}
      updated={PRIVACY_UPDATED}
      sections={SECTIONS}
      otherHref="/terms/"
      otherLabel="Terms of Use"
    />
  );
}
