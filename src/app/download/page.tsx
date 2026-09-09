import type { Metadata } from "next";
import { DownloadPage } from "@/components/download/DownloadPage";
import { DOWNLOAD } from "@/lib/brand";
import { fetchLatestRelease, slimRelease } from "@/lib/releases";
import { readAppConfig } from "@/lib/server/app-config";

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
  // app_configuration decides what is current; GitHub Releases is the fallback
  // and also supplies the per-asset detail that app_configuration has no room
  // for. Both are read on the server, so the HTML carries real links with no JS.
  const [config, release] = await Promise.all([
    readAppConfig(),
    fetchLatestRelease().then(slimRelease),
  ]);
  return <DownloadPage release={release} config={config} />;
}
