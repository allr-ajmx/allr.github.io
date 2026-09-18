import { Access } from "@/components/Access";
import { AllrPromise } from "@/components/AllrPromise";
import { AmbientShader } from "@/components/AmbientShader";
import { Audiences } from "@/components/Audiences";
import { Contrast } from "@/components/Contrast";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Gap } from "@/components/Gap";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { PlatformProgress } from "@/components/PlatformProgress";
import { Provide } from "@/components/Provide";

/**
 * Landing page — Rebuilt from ALLR_UPDATED_MASTER_STORY.md.
 * Hero (Act I/II) → Gap (Act I) → Provide: 3 Harnesses (Act II) →
 * HowItWorks: Operating Loop (Act III) → Contrast (Act VIII) →
 * Audiences (Act IV) → PlatformProgress (Act VI/VII) → Access → Resolve (Promise · FAQ · Final CTA).
 */
export default function Home() {
  return (
    <>
      <AmbientShader />
      <Header />
      <main id="top" className="relative">
        <Hero />
        <Gap />
        <Provide />
        <HowItWorks />
        <Contrast />
        <Audiences />
        <PlatformProgress />
        <Access />
        <AllrPromise />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
