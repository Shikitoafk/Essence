"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptComparison } from "@/app/actions";
import {
  AXIS_BLURB,
  AXIS_LABEL,
  type Essay,
  type EssayComparison,
} from "@/lib/types";

interface Props {
  comparison: EssayComparison;
  winner: Essay;
  loser: Essay;
}

export default function ComparisonResult({ comparison, winner, loser }: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepted = Boolean(comparison.accepted_at);
  const narrow = comparison.margin === "narrow";

  async function accept() {
    setAccepting(true);
    setError(null);
    const result = await acceptComparison(comparison.id);
    if (!result.ok) {
      setError(result.error);
      setAccepting(false);
      return;
    }
    router.push(`/essays/${result.winnerId}`);
    router.refresh();
  }

  const nameFor = (id: string) => (id === winner.id ? winner.title : loser.title);

  return (
    <div className="mt-6">
      {/* The verdict is the product. Everything below it is supporting evidence. */}
      <section className="rounded-lg border border-line bg-white p-6">
        <p className="text-xs uppercase tracking-widest text-muted">
          Submit this one
        </p>
        <h1 className="mt-1 font-serif text-3xl leading-tight">
          {winner.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              narrow
                ? "bg-flag-medium/15 text-flag-medium"
                : "bg-flag-low/20 text-flag-low"
            }`}
          >
            {narrow ? "Narrow call" : "Clear win"}
          </span>
          <span className="text-muted">
            over <span className="text-ink">{loser.title}</span>
          </span>
        </div>

        {comparison.verdict_summary && (
          <p className="mt-4 leading-relaxed">{comparison.verdict_summary}</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg">Why</h2>
        <p className="mt-1 text-sm text-muted">
          Core self, voice and risk decide it. Texture and structure only break
          ties.
        </p>

        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-white">
          {comparison.axis_scores.map((score) => (
            <li key={score.axis} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{AXIS_LABEL[score.axis]}</span>
                <span
                  className={`text-xs ${
                    score.winner_id === winner.id
                      ? "text-flag-low"
                      : "text-muted"
                  }`}
                >
                  {nameFor(score.winner_id)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {AXIS_BLURB[score.axis]}
              </p>
              {score.justification && (
                <p className="mt-2 text-sm">{score.justification}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg">What to carry over</h2>
        {comparison.transferable_elements.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-line bg-white p-5 text-sm text-muted">
            Nothing from {loser.title} is worth moving across. Submit the winner
            as it stands.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Your own words, from {loser.title}. Paste and adapt them yourself —
              nothing here gets inserted for you.
            </p>
            <div className="mt-4 space-y-3">
              {comparison.transferable_elements.map((element, i) => (
                <TransferCard key={i} element={element} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-10 rounded-lg border border-line bg-white p-6">
        {accepted ? (
          <>
            <h2 className="font-serif text-lg">Decision locked in</h2>
            <p className="mt-1 text-sm text-muted">
              {loser.title} is archived. It stays readable, just out of the way.
            </p>
            <Link
              href={`/essays/${winner.id}`}
              className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm text-paper hover:opacity-90"
            >
              Open {winner.title}
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-serif text-lg">Settle it</h2>
            <p className="mt-1 text-sm text-muted">
              Accepting archives {loser.title} and takes you to the winner.
              Keeping both live is what turns this into an endless loop — you can
              still restore it later.
            </p>
            {error && (
              <p className="mt-3 rounded-md bg-flag-high/10 px-3 py-2 text-sm text-flag-high">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={accept}
              disabled={accepting}
              className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {accepting ? "Settling…" : `Accept — submit ${winner.title}`}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function TransferCard({
  element,
}: {
  element: EssayComparison["transferable_elements"][number];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(element.quote);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the quote is selectable on screen regardless.
    }
  }

  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <blockquote className="border-l-2 border-accent/40 pl-3 font-serif text-sm leading-relaxed">
        {element.quote}
      </blockquote>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted">
            Where it belongs
          </dt>
          <dd className="mt-0.5">{element.destination_hint}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted">
            What it adds
          </dt>
          <dd className="mt-0.5">{element.why}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={copy}
        className="mt-3 rounded-full border border-line px-3 py-1 text-xs hover:border-accent"
      >
        {copied ? "Copied" : "Copy quote"}
      </button>
    </article>
  );
}
