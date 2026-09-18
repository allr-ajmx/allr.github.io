import { Reveal } from "@/components/Reveal";
import { MultiDeviceConstellation } from "@/components/ui/MultiDeviceConstellation";
import { SectionHead } from "@/components/ui/SectionHead";
import { ACCESS } from "@/lib/brand";

/**
 * Access — Multi-Surface Access as one chapter (Act VII).
 * Interactive scroll-driven constellation illustration:
 * The authentic central Allr logo blooms 6 platform nodes (Web, macOS, Windows, Linux, Android, iOS)
 * outwards from behind the logo as the user scrolls down into the section.
 */
export function Access() {
  return (
    <section id="access" className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden">
      <div className="wrap relative">
        <SectionHead
          eyebrow="Act VII · Multi-Surface Access"
          title={ACCESS.title}
        >
          {ACCESS.sub}
        </SectionHead>

        {/* Pure Scroll-Driven Radial SVG Illustration */}
        <Reveal className="mx-auto mt-6 max-w-[600px]" delay={60}>
          <MultiDeviceConstellation />
        </Reveal>
      </div>
    </section>
  );
}
