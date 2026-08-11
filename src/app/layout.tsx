import type { Metadata } from "next";
import { Instrument_Serif, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Two typefaces, and the division of labour is the whole argument.
 *
 * Instrument Serif is Essence speaking — the wordmark and display headlines.
 * Newsreader is for prose: this page's own body copy and, more importantly,
 * every student draft the app renders. Reading text is set in a reading face,
 * with real italics, because the product's entire job is close reading and a
 * draft typeset in interface sans invites skimming.
 *
 * What is left in system sans is only chrome — buttons, nav, small labels —
 * which should disappear rather than be admired.
 *
 * Both are self-hosted by next/font rather than fetched from Google at runtime,
 * so no third party sees a request when a student opens their essay.
 */
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
    <html lang="en" className={`${wordmark.variable} ${reading.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        {/* Page-view counts only — no cookies, no cross-site tracking, and no
            essay content. The privacy page tells students this is here. */}
        <Analytics />
      </body>
    </html>
  );
}
