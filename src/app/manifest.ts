import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    start_url: "./",
    display: "standalone",
    background_color: "#FBF8F2",
    theme_color: "#2E9E63",
    lang: "en",
    icons: [
      {
        src: "./icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
