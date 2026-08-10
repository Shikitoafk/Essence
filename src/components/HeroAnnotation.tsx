"use client";

import { useEffect, useState } from "react";

/**
 * The product, performed once, in about two seconds.
 *
 * A landing page for a text tool has no screenshot worth showing — the thing
 * being sold is a way of reading. So the hero does the reading: a draft
 * paragraph sits there looking perfectly fine, a highlighter finds the sentence
 * that is doing no work, and a question arrives in the margin.
 *
 * It runs once. A looping animation would keep pulling the eye back to a thing
 * the reader has already understood, and this page wants them further down it.
 */

/** Milliseconds from mount. The gap between them is the beat that makes it read
 *  as someone noticing something, rather than a card animating in. */
const SWEEP_AT = 900;
const NOTE_AT = 1900;

export default function HeroAnnotation() {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const sweep = setTimeout(() => setStage(1), SWEEP_AT);
    const note = setTimeout(() => setStage(2), NOTE_AT);
    return () => {
      clearTimeout(sweep);
      clearTimeout(note);
    };
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
      <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(28,26,23,0.04),0_12px_40px_-12px_rgba(28,26,23,0.14)]">
        <figcaption className="flex items-center gap-2.5 border-b border-line px-5 py-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
            <span className="h-2.5 w-2.5 rounded-full bg-line" />
          </span>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
            Personal statement — draft 1
          </span>
        </figcaption>

        <blockquote className="ruled draft-shared-metrics px-5 py-4 text-ink sm:px-7 sm:py-6">
          I spent that summer cataloguing beetles in my grandfather&apos;s
          garage.{" "}
          <span className="sweep" data-on={stage >= 1}>
            The work taught me patience, and I became someone who finishes what
            he starts.
          </span>{" "}
          By August the drawers were full.
        </blockquote>
      </figure>

      <aside
        className="margin-note rounded-2xl border border-line bg-paper p-5 shadow-[0_10px_30px_-16px_rgba(28,26,23,0.3)] sm:p-6"
        data-shown={stage >= 2}
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            Underdeveloped change
          </span>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">
            high
          </span>
        </div>

        <p className="mt-4 font-serif text-lg leading-snug text-ink">
          What was the next thing you nearly quit — and didn&apos;t?
        </p>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Could be that same week, that autumn, or much later.
        </p>
      </aside>
    </div>
  );
}
