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
    <article className="rounded-[1.15rem] border border-flag-low/20 bg-[#edf8f0] p-5">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.17em] text-flag-low">
        Protect this passage
      </p>

      <blockquote className="mt-3 border-l-2 border-flag-low/30 pl-4 font-serif text-[0.98rem] leading-relaxed">
        {item.quote}
      </blockquote>

      {item.why && <p className="mt-3 text-sm text-muted">{item.why}</p>}
    </article>
  );
}
