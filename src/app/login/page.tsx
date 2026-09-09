import type { Metadata } from "next";
import { LoginPage } from "@/components/account/LoginPage";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Allr account with Google.",
  // URL-only, like /design (DESIGN.md §16). It is not in the sitemap either.
  robots: { index: false, follow: false },
};

export default function Login() {
  return <LoginPage />;
}
