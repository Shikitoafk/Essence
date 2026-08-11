import type { Metadata } from "next";
import { Geist, Instrument_Serif, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Three typefaces, and the division of labour is the whole argument.
 *
 * Geist is the interface: headings, buttons, labels, everything the product
 * says in its own voice. A grotesque with weight behind it, set tight — the
 * point is that it looks built rather than written.
 *
 * Newsreader is the student's writing, and only that. A draft is prose and has
 * to read like prose; typeset in the interface's sans it invites skimming,
 * which is the one thing this product exists to prevent.
 *
 * Instrument Serif is the wordmark alone. It is the mark, so it does not move
 * when the rest of the system does.
 *
 * All self-hosted by next/font rather than fetched from Google at runtime, so
 * no third party sees a request when a student opens their essay.
 */
const ui = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
});

const wordmark = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

const reading = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-reading",
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
    <html
      lang="en"
      className={`${ui.variable} ${wordmark.variable} ${reading.variable}`}
    >
      <body className="min-h-screen antialiased">
        {children}
        {/* Page-view counts only — no cookies, no cross-site tracking, and no
            essay content. The privacy page tells students this is here. */}
        <Analytics />
      </body>
    </html>
  );
}
