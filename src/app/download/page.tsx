import type { Metadata } from "next";
import { DownloadPage } from "@/components/download/DownloadPage";
import { DOWNLOAD } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Download",
  description: DOWNLOAD.sub,
  alternates: { canonical: "/download" },
};

export default function Page() {
  return <DownloadPage />;
}
