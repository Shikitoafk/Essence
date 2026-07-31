"use client";

import type { WorkingWell } from "@/lib/types";

/**
 * A passage the read says to leave alone.
 *
 * Styled deliberately quiet — no red, no warning affordance, no action buttons.
 * It sits among the spot cards because that is where the student is deciding
 * what to change, and it is the only thing on that screen telling them what not
 * to touch.
 */
export default function KeepCard({ item }: { item: WorkingWell }) {
  return (
    <article className="rounded-lg border border-line bg-accent-soft/30 p-4">
      <p className="text-xs uppercase tracking-widest text-muted">
        Working — leave it alone
      </p>

      <blockquote className="mt-2 border-l-2 border-muted/30 pl-3 font-serif text-sm leading-relaxed">
        {item.quote}
      </blockquote>

      {item.why && <p className="mt-3 text-sm text-muted">{item.why}</p>}
    </article>
  );
}
