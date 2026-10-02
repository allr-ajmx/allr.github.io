import type { Metadata } from "next";
import { AdminOpsPage } from "@/components/account/AdminOpsPage";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminOpsPage />;
}
