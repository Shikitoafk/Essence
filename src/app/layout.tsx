import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * The wordmark's typeface. Self-hosted by next/font rather than fetched from
 * Google at runtime, so there's no third-party request on page load.
 */
const wordmark = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: "Essence — sharper questions, not rewritten sentences",
  description:
    "Essence reads your college essay, finds the moments where you declared a feeling instead of showing it, and asks one precise question at a time. Every word stays yours.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={wordmark.variable}>
      <body className="min-h-screen antialiased">
        {children}
        {/* Page-view counts only — no cookies, no cross-site tracking, and no
            essay content. The privacy page tells students this is here. */}
        <Analytics />
      </body>
    </html>
  );
}
