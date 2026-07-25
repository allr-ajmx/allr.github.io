import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { Problem } from "@/components/Problem";
import { AllrPromise } from "@/components/AllrPromise";
import { PublishingBand } from "@/components/PublishingBand";
import { Solution } from "@/components/Solution";
import { WhatAllrMakes } from "@/components/WhatAllrMakes";
import { WhoItsFor } from "@/components/WhoItsFor";

export default function Home() {
  return (
    <>
      <Header />
      <main id="top">
        <Hero />
        <Problem />
        <Solution />
        <WhatAllrMakes />
        <HowItWorks />
        <PublishingBand />
        <AllrPromise />
        <WhoItsFor />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
