import { AmbientBackground } from "@/components/AmbientBackground";
import { AllrPromise } from "@/components/AllrPromise";
import { Faq } from "@/components/Faq";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { OnYourPhone } from "@/components/OnYourPhone";
import { Pricing } from "@/components/Pricing";
import { PublishingBand } from "@/components/PublishingBand";
import { Solution } from "@/components/Solution";
import { BloomJourney } from "@/components/BloomJourney";

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <Header />
      <main id="top" className="relative">
        <Hero />
        <PublishingBand />
        <HowItWorks />
        <BloomJourney />
        <Solution />
        <OnYourPhone />
        <AllrPromise />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
