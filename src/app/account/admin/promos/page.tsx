import type { Metadata } from "next";
import { AdminPromosPage } from "@/components/account/AdminPromosPage";

export const metadata: Metadata = {
  title: "Promo codes",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPromosPage />;
}
