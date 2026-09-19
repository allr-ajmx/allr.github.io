import type { Metadata } from "next";
import { AmbientShader } from "@/components/AmbientShader";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { RoadmapPageContent } from "@/components/roadmap/RoadmapPageContent";
import { ROADMAP_PAGE_COPY, SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Roadmap · ${SITE_NAME}`,
  description: ROADMAP_PAGE_COPY.sub,
  alternates: { canonical: "/roadmap" },
  openGraph: {
    type: "website",
    url: "/roadmap",
    title: `Roadmap · ${SITE_NAME}`,
    description: ROADMAP_PAGE_COPY.sub,
  },
  twitter: {
    card: "summary_large_image",
    title: `Roadmap · ${SITE_NAME}`,
    description: ROADMAP_PAGE_COPY.sub,
  },
};

export default function RoadmapPage() {
  return (
    <>
      <AmbientShader />
      <Header />
      <main id="top" className="relative min-h-[85vh]">
        <RoadmapPageContent />
      </main>
      <Footer />
    </>
  );
}
