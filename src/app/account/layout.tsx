import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";

/**
 * A server layout so `metadata` works; the shell inside it is the client half.
 *
 * Nothing here protects anything. The site is a static export, so this page is
 * public HTML that happens to render a sign-in redirect once JavaScript runs —
 * the actual boundary is `firebase/firestore.rules`, which is what refuses to
 * hand over anybody's data. No account content is ever in the exported file.
 */
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountShell>{children}</AccountShell>;
}
