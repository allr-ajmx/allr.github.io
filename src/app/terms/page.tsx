import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import {
  BILLING_ENTITY,
  CONTACT_EMAIL,
  LEGAL_OPERATOR,
  LEGAL_TRADING_AS,
  MINIMUM_AGE,
  TERMS_UPDATED,
  TERMS_VERSION,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The agreement between you and Allr: who may hold an account, what you can expect, and what we expect back.",
};

const SECTIONS: readonly LegalSection[] = [
  {
    heading: "Who this agreement is between",
    body: [
      `These Terms of Use (“Terms”) constitute a legally binding agreement between you and ${LEGAL_OPERATOR}, trading as ${LEGAL_TRADING_AS} (“Allr”, “we”, “us”, or “our”). “Allr” means the Allr website, the free desktop and mobile client applications (including for iOS and Android), and the paid artificial intelligence workspace and related services made available in connection with those applications.`,
      `By creating an account, accessing, or using Allr, you agree to be bound by these Terms and by our Privacy Policy. If you do not agree, you must not access or use Allr.`,
      `Billing and payment collection for Allr are serviced by ${BILLING_ENTITY}. ${BILLING_ENTITY} is not the provider of Allr and is not a party to these Terms except to the extent it processes payments on our behalf. Legal notices under these Terms may be sent to ${CONTACT_EMAIL}.`,
      `Allr is presently offered on an early-access basis. If the legal entity that operates Allr changes, these Terms will be superseded by a new agreement published by that entity; these Terms will not automatically transfer to any successor without a new version being made available for acceptance.`,
    ],
  },
  {
    heading: `Eligibility (${MINIMUM_AGE} years of age or older)`,
    body: [
      `You must be at least ${MINIMUM_AGE} years of age to create an Allr account or use Allr. By registering, you represent and warrant that you meet this requirement. We ask you to confirm this with a checkbox at registration and will not complete registration unless you do; the confirmation is self-declared and is not verified against identity documents. If we determine that you are under ${MINIMUM_AGE}, we may suspend or terminate your account and delete associated data.`,
      `Allr is not directed to children under ${MINIMUM_AGE}. You may not use Allr on behalf of any person under ${MINIMUM_AGE}.`,
    ],
  },
  {
    heading: "Your account",
    body: [
      `Access to Allr accounts is presently available only through Google sign-in. Each account is personal to a single individual and a single Google identity. You may not share credentials, permit others to access your account, or impersonate another person.`,
      `You are responsible for all activity that occurs under your account and for maintaining the security of your Google account. You must notify us promptly at ${CONTACT_EMAIL} if you become aware of any unauthorised access or use.`,
      `During early access, registrations are offered to individuals. The individual who completes registration is the owner of the workspace associated with that account.`,
    ],
  },
  {
    heading: "The client applications and the workspace",
    body: [
      `The Allr desktop and mobile client applications you download, and the Allr AI workspace they connect to, are built and operated separately from this website. The client applications are provided free of charge and may be used with the open-source release of the agent software where applicable. The workspace is a separate paid service and may include managed memories, templates, hosting, deployment, and related features.`,
      `The terms specific to the workspace — including its pricing, any promotional period or AI credit, and how it is billed — will be communicated to you by email after you request early access, and apply once they have been communicated to you. These Terms apply to the website and your Allr account, and to the client applications and the workspace except where those communicated terms provide otherwise. Features and availability may change during early access.`,
    ],
  },
  {
    heading: "Your content and intellectual property",
    body: [
      `As between you and Allr, you retain all right, title, and interest in and to the content, products, and other materials you submit or create in your workspace, including AI-generated outputs to the extent any rights exist in them under applicable law (“User Content”). Allr does not claim ownership of User Content.`,
      `You grant Allr a limited, worldwide, non-exclusive licence to host, store, process, back up, transmit, display, and deploy User Content solely as necessary to provide and operate Allr in accordance with your instructions and these Terms. We will not use User Content to train machine-learning models unless you provide a separate, explicit opt-in.`,
      `You are solely responsible for User Content, for products you publish, and for any contracts or obligations those products create with third parties.`,
    ],
  },
  {
    heading: "Our intellectual property",
    body: [
      `Allr, including its software, design, and the Allr name and marks, is owned by us or our licensors and is protected by intellectual property laws. Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable right to access and use Allr for its intended purpose. No other rights are granted, except as provided by an applicable open-source licence.`,
    ],
  },
  {
    heading: "Prohibited uses",
    body: [
      `You shall not use Allr to engage in any unlawful, harmful, fraudulent, or deceptive activity; to attack, disrupt, scrape, or overload the service; to access another person’s account without authorisation; to distribute malware; to send unsolicited bulk communications; or to infringe the intellectual property or other rights of any person.`,
      `You shall not resell or rebrand Allr as your own platform, reverse-engineer the managed service except to the extent permitted by applicable law or by an applicable open-source licence, or use Allr to create a competing hosted service by copying our managed systems or confidential materials.`,
      `We may suspend or terminate accounts that violate this section, as described in the section titled “Termination and data retention”.`,
    ],
  },
  {
    heading: "Content rules",
    body: [
      `You are responsible for everything you create, upload, or publish with Allr. You shall not create, host, publish, or share through Allr any content that: (a) belongs to another person and to which you have no right; (b) is defamatory, obscene, pornographic, paedophilic, or invasive of another person’s privacy, including bodily privacy; (c) sexually exploits or endangers children, or is otherwise harmful to children; (d) insults or harasses on the basis of gender, or is racially or ethnically objectionable; (e) promotes or incites violence, hatred, terrorism, money laundering, or unlawful gambling; (f) infringes any patent, trademark, copyright, or other proprietary right; (g) deceives or misleads recipients about its origin, or knowingly communicates misinformation or information that is patently false; (h) impersonates another person, including by presenting AI-generated material as a real person’s words, image, or voice in a manner intended to deceive; (i) threatens the unity, integrity, defence, security, or sovereignty of India, friendly relations with foreign States, or public order; (j) contains malware or any code designed to interrupt, destroy, or limit the functionality of any computer resource; or (k) otherwise violates applicable law.`,
      `If a product you publish with Allr collects personal data from other people, you are responsible for giving them any notice and obtaining any consent that applicable law requires.`,
      `We may remove or disable access to content, or unpublish a product, that we reasonably believe breaches these rules, or where we are required to do so by law or by a court or government order. To report content published with Allr that you believe breaches these rules, write to ${CONTACT_EMAIL} with the address of the content and the reason for your report. We will acknowledge reports and act on them in accordance with applicable law.`,
    ],
  },
  {
    heading: "Fees, subscriptions, and refunds",
    body: [
      `No fees are charged through this website or your Allr account at present. Pricing, any promotional period or AI credit, and billing terms for the workspace will be communicated to you by email after you request early access, before you are asked to pay anything. When fees are charged, they are collected through ${BILLING_ENTITY} and any payment processors identified at the time of checkout.`,
      `Where a subscription is offered, it renews automatically until cancelled unless the terms communicated to you state otherwise. Cancellation ends future charges but does not entitle you to a refund for any period already paid. All fees are non-refundable except where required by mandatory applicable law. A chargeback or payment-network dispute does not create a contractual right to a refund under these Terms.`,
      `Upon expiry or termination of your licence, published products will cease to be available. Data retention after termination is described in the section titled “Termination and data retention”.`,
    ],
  },
  {
    heading: "Availability, disclaimers, and limitation of liability",
    body: [
      `We endeavour to keep the workspace available, including on a continuous basis during early access. Notwithstanding the foregoing, Allr is provided on an “as available” and “as is” basis. Early access means that features may change, be interrupted, or contain errors. To the maximum extent permitted by applicable law, we disclaim all warranties, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement, except for any warranties that cannot be excluded under the laws of India.`,
      `Outputs generated by artificial intelligence may be inaccurate or incomplete. You are responsible for reviewing User Content and published products before relying on them or making them available to others. Allr does not provide legal, financial, tax, medical, or other professional advice, and outputs should not be relied on as such.`,
      `To the maximum extent permitted by applicable law, Allr’s aggregate liability arising out of or relating to these Terms or your use of Allr shall not exceed the greater of (a) the total fees you paid to Allr for the workspace during the twelve (12) months immediately preceding the claim and (b) one hundred United States dollars (USD 100). Nothing in these Terms excludes or limits liability for fraud, wilful misconduct, or death or personal injury caused by negligence, or any other liability that cannot be limited under Indian law.`,
    ],
  },
  {
    heading: "Termination and data retention",
    body: [
      `You may stop using Allr at any time and may request closure of your account by contacting ${CONTACT_EMAIL}. We may suspend or terminate your account if you breach these Terms, if we are required to do so by law, or if we discontinue the service.`,
      `Before we suspend or terminate your account, or discontinue Allr or the workspace, we will give you at least thirty (30) days’ notice by email. We may give shorter notice, or none, where we are required to act immediately by law or by a court or government order, where your use poses a risk of harm to Allr, our users, or others, or where you have committed a serious or repeated breach of these Terms, including of the content rules.`,
      `If a promotional or unpaid early-access period ends and you do not commence a paid subscription, we will retain workspace data for fourteen (14) days and thereafter permanently delete it.`,
      `If a paid licence ends, we will retain workspace data for ninety (90) days and thereafter permanently delete it, unless you have requested a backup and/or opted into a paid data-persistence option where offered. After deletion, User Content cannot be recovered.`,
      `If you ask us to delete your account, we will delete everything we hold about you — your account, your workspace data, and the record we keep to prevent duplicate accounts — within ninety (90) days of your request, except records we are required by law to keep. If you do not ask, the retention periods above apply and deletion takes place automatically when they end.`,
    ],
  },
  {
    heading: "Indemnity",
    body: [
      `To the extent permitted by applicable law, you shall indemnify and hold harmless Allr from and against any claims, losses, liabilities, damages, and expenses (including reasonable legal fees) brought by a third party and arising out of (a) User Content or products you publish, (b) your breach of these Terms, or (c) your violation of applicable law or of any right of a third party.`,
    ],
  },
  {
    heading: "Third-party services",
    body: [
      `Allr relies on and links to services operated by third parties, including Google for sign-in and GitHub for application downloads. Your use of those services is governed by their own terms and privacy policies. We are not responsible for third-party services, and their unavailability may affect Allr.`,
      `When you use an AI model through Allr, your content is processed by the provider of the model you select. If you add your own AI provider, your use of it, including any charges it bills you, is governed by your agreement with that provider, and you are responsible for keeping your key secure. Your key is stored in your workspace and is not separately encrypted, so its security depends on the security of your Allr account.`,
    ],
  },
  {
    heading: "Open-source software",
    body: [
      `Parts of Allr, including the agent software, are made available under open-source licences. Where an open-source licence applies to a component, that licence governs your use of that component, and nothing in these Terms limits the rights it grants you. These Terms govern everything else.`,
    ],
  },
  {
    heading: "Feedback",
    body: [
      `If you send us suggestions, ideas, or other feedback about Allr, we may use that feedback without restriction and without obligation to you. Feedback does not include User Content.`,
    ],
  },
  {
    heading: "General provisions",
    body: [
      `Entire agreement. These Terms, together with the Privacy Policy and any terms communicated to you under the section titled “The client applications and the workspace”, constitute the entire agreement between you and Allr concerning Allr and supersede any prior agreement on that subject.`,
      `Assignment. You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We will not assign these Terms to a successor except as described in the section titled “Who this agreement is between”.`,
      `Force majeure. We are not liable for any delay or failure to perform caused by events beyond our reasonable control, including natural disasters, epidemics, war, civil unrest, government action, and failures of utilities, networks, or hosting providers, or cyberattacks.`,
      `No waiver. A failure or delay in enforcing any provision of these Terms is not a waiver of the right to enforce it later.`,
      `Survival. Provisions that by their nature are intended to survive termination survive it, including those concerning User Content, content rules, indemnity, disclaimers and limitation of liability, data retention, and governing law and disputes.`,
      `Notices. We may give you notice by email to the address associated with your Allr account or, for notices to all users, by posting on the website. You may give us notice at ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: "Changes, governing law, and disputes",
    body: [
      `We may amend these Terms from time to time. For material changes, we will update the version identifier and, where your account already records an accepted version, require renewed acceptance before continued use. The “Last updated” date on this page indicates when the current version became effective.`,
      `These Terms are governed by the laws of India. Subject to any mandatory consumer protections, the courts at Mumbai, India, shall have exclusive jurisdiction over disputes arising out of or relating to these Terms. Before commencing formal proceedings, you agree to contact ${CONTACT_EMAIL} so that we may attempt to resolve the matter in good faith.`,
      `If any provision of these Terms is held unenforceable, the remaining provisions shall continue in full force and effect.`,
    ],
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="These Terms of Use govern your access to and use of Allr, including the website and the Allr applications for desktop, iOS, and Android, and the paid AI workspace."
      version={TERMS_VERSION}
      updated={TERMS_UPDATED}
      sections={SECTIONS}
      otherHref="/privacy/"
      otherLabel="Privacy Policy"
    />
  );
}
