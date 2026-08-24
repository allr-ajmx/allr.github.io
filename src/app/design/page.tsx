import type { Metadata } from "next";
import { VocabularyPage } from "@/components/design/VocabularyPage";

export const metadata: Metadata = {
  title: "Design vocabulary",
  description:
    "Internal Allr design vocabulary — tokens, voice, and components for marketing surfaces.",
  robots: { index: false, follow: false },
};

export default function Design() {
  return <VocabularyPage />;
}
