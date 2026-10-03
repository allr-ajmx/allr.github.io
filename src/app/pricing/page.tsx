import type { Metadata } from "next";
import { AmbientShader } from "@/components/AmbientShader";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PricingPageContent } from "@/components/pricing/PricingPageContent";
import { PRICING, SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Pricing · ${SITE_NAME}`,
  description: PRICING.sub,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: `Pricing · ${SITE_NAME}`,
    description: PRICING.sub,
  },
  twitter: {
    card: "summary_large_image",
    title: `Pricing · ${SITE_NAME}`,
    description: PRICING.sub,
  },
};

export default function PricingPage() {
  return (
    <>
      <AmbientShader />
      <Header />
      <main id="top" className="relative min-h-[85vh]">
        <PricingPageContent />
      </main>
      <Footer />
    </>
  );
}
