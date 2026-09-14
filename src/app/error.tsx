"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <h1 className="font-display text-3xl text-ink">This page couldn’t load.</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Try again, or return to your essays to open another document.
      </p>
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-5 py-2.5 text-sm text-white"
        >
          Try again
        </button>
        <Link href="/dashboard" className="text-sm text-accent">Your essays</Link>
      </div>
    </main>
  );
}
