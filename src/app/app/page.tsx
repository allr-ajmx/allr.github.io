import type { Metadata } from "next";
import { AmbientShader } from "@/components/AmbientShader";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "The app",
  description: "Allr on desktop and mobile — page rebuilding.",
  alternates: { canonical: "/app" },
  robots: { index: false, follow: true },
};

/**
 * /app retired pending rebuild. Soft door: /download.
 */
export default function AppPage() {
  return (
    <>
      <AmbientShader />
      <Header />
      <main id="top" className="relative">
        <section className="wrap flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
          <h1 className="mb-3 font-serif text-[clamp(1.8rem,4vw,2.6rem)] text-ink">
            The app
          </h1>
          <p className="max-w-[36rem] text-[1.05rem] text-ink-soft">
            This page is being rebuilt. Desktop builds are on Download.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
