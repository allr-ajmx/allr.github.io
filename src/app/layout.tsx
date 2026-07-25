import type { Metadata } from "next";
import { Nunito_Sans, Young_Serif } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Allr — the one subscription that replaces all of them",
  description:
    "One AI workspace that makes finished work — from decks, docs, spreadsheets, and videos, all the way to working websites, apps, and games. Describe what you want. Allr makes it, and helps you share it with the world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunitoSans.variable} ${youngSerif.variable} antialiased`}
      // The `js` class below is added to this element before hydration, so its
      // className is expected to differ from the server's.
      suppressHydrationWarning
    >
      <head>
        {/* Marks, before first paint, that scroll-reveal can actually run.
            Without it the reveal blocks render visible, so neither a visitor
            without JavaScript nor one without IntersectionObserver is ever
            left looking at hidden content. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('IntersectionObserver' in window)document.documentElement.classList.add('js')`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
