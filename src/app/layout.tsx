import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
