import type { Metadata } from "next";
import { DownloadPage } from "@/components/download/DownloadPage";
import { DOWNLOAD } from "@/lib/brand";
import { fetchLatestRelease, slimRelease } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download",
  description: DOWNLOAD.sub,
  alternates: { canonical: "/download" },
  openGraph: {
    type: "website",
    url: "/download",
    title: `${DOWNLOAD.title} · Allr`,
    description: DOWNLOAD.sub,
  },
  twitter: {
    card: "summary_large_image",
    title: `${DOWNLOAD.title} · Allr`,
    description: DOWNLOAD.sub,
  },
};

export default async function Download() {
  // Build-time fetch: the exported HTML carries real links, no JS required.
  const release = slimRelease(await fetchLatestRelease());
  return <DownloadPage release={release} />;
}
