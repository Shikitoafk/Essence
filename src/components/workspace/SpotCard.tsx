"use client";

import {
  IMPACT_BLURB,
  IMPACT_LABEL,
  type FlaggedSpot,
  type Impact,
  type SpotStatus,
} from "@/lib/types";

/** Weight, not alarm: polish must read as safe to ignore, because it is. */
const IMPACT_STYLE: Record<Impact, string> = {
  structural: "bg-flag-high/15 text-flag-high",
  substantive: "bg-flag-medium/15 text-flag-medium",
  polish: "bg-line/60 text-muted",
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "text-flag-high",
  medium: "text-flag-medium",
  low: "text-flag-low",
};

const STATUS_LABEL: Record<SpotStatus, string> = {
  open: "Open",
  answered: "Material ready — not in the draft yet",
  resolved: "Resolved",
  skipped: "Set aside",
};

interface Props {
  spot: FlaggedSpot;
  active: boolean;
  missingInDraft: boolean;
  onSelect: () => void;
  onStatusChange: (status: SpotStatus) => void;
}

export default function SpotCard({
  spot,
  active,
  missingInDraft,
  onSelect,
  onStatusChange,
}: Props) {
  // `answered` is live work, not settled work — it must not fade out.
  const dimmed = spot.status === "resolved" || spot.status === "skipped";
  const awaitingRevision = spot.status === "answered";

  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-lg border bg-white p-4 transition ${
        awaitingRevision
          ? "border-flag-medium/60 shadow-sm"
          : active
            ? "border-accent shadow-sm"
            : "border-line hover:border-accent/50"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${IMPACT_STYLE[spot.impact]}`}
          title={IMPACT_BLURB[spot.impact]}
        >
          {IMPACT_LABEL[spot.impact]}
        </span>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          {spot.pattern_name}
        </span>
        <span
          className={`text-xs ${CONFIDENCE_STYLE[spot.confidence] ?? "text-muted"}`}
        >
          {spot.confidence} confidence
        </span>
        {spot.status !== "open" && (
          <span className="ml-auto text-xs text-muted">
            {STATUS_LABEL[spot.status]}
          </span>
        )}
      </div>

      <blockquote className="mt-3 border-l-2 border-accent/40 pl-3 font-serif text-sm leading-relaxed">
        {spot.quoted_text}
      </blockquote>

      {missingInDraft && (
        <p className="mt-2 text-xs text-flag-medium">
          This line isn&apos;t in your current draft any more — it&apos;s kept
          here from the version that was read.
        </p>
      )}

      {/* The student's own material, handed back so it reads as material rather
          than as a chat message they have to go dig out. Deliberately a list of
          raw specifics: no ordering into prose, no suggested phrasing. */}
      {awaitingRevision && spot.new_material.length > 0 && (
        <div className="mt-4 rounded-md border border-flag-medium/40 bg-flag-medium/10 p-3">
          <p className="text-xs uppercase tracking-widest text-flag-medium">
            What you turned up — not in the draft yet
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {spot.new_material.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-flag-medium">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Your words, not ours. Work them into the quoted line above however
            you want — this closes itself once that passage changes.
          </p>
        </div>
      )}

      <dl className="mt-4 space-y-2.5 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted">
            What is clear
          </dt>
          <dd className="mt-0.5">{spot.what_is_clear}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted">
            What is still unexplored
          </dt>
          <dd className="mt-0.5">{spot.what_is_unexplored}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-muted">
            Why it matters here
          </dt>
          <dd className="mt-0.5">{spot.why_it_matters}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3 text-xs">
        {spot.status === "open" || awaitingRevision ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange("resolved");
              }}
              className="rounded-full border border-line px-3 py-1 hover:border-flag-low hover:text-flag-low"
            >
              {awaitingRevision ? "Already handled it" : "Mark resolved"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange("skipped");
              }}
              className="rounded-full border border-line px-3 py-1 hover:border-muted"
            >
              Nothing here — set aside
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange("open");
            }}
            className="rounded-full border border-line px-3 py-1 hover:border-accent hover:text-accent"
          >
            Reopen
          </button>
        )}
      </div>
    </article>
  );
}
