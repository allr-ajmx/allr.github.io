import type { Metadata } from "next";
import { AmbientBackground } from "@/components/AmbientBackground";
import { AppHero } from "@/components/app/AppHero";
import { GetTheApp } from "@/components/app/GetTheApp";
import { Growing } from "@/components/app/Growing";
import { InsideTheApp } from "@/components/app/InsideTheApp";
import { OnePlatform } from "@/components/app/OnePlatform";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { APP } from "@/lib/brand";
import { fetchLatestRelease } from "@/lib/releases";

export const metadata: Metadata = {
  title: APP.title,
  description: APP.description,
  alternates: { canonical: "/app" },
  openGraph: {
    type: "website",
    url: "/app",
    title: `${APP.title} · Allr`,
    description: APP.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP.title} · Allr`,
    description: APP.description,
  },
};

export default async function AppPage() {
  // Runs during `next build`, so the static export names a real version before
  // (and without) any client JS. Every download button here goes to /download,
  // so the version is all this page needs from the release.
  const release = await fetchLatestRelease();

  return (
    <>
      <AmbientBackground />
      <Header />
      <main id="top" className="relative">
        <AppHero version={release?.version ?? null} />
        <OnePlatform />
        <InsideTheApp />
        <Growing />
        <GetTheApp />
      </main>
      <Footer />
    </>
  );
}
