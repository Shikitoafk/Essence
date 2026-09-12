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

const STATUS_LABEL: Record<SpotStatus, string> = {
  open: "Open",
  answered: "Material ready — not in the draft yet",
  resolved: "Resolved",
  skipped: "Set aside",
};

/** The collapsed line has room for a word or two, not a sentence. */
const STATUS_SHORT: Record<SpotStatus, string> = {
  open: "",
  answered: "Ready to work in",
  resolved: "Resolved",
  skipped: "Set aside",
};

interface Props {
  spot: FlaggedSpot;
  active: boolean;
  missingInDraft: boolean;
  onSelect: () => void;
  onStatusChange: (status: SpotStatus) => void;
  /** Opens the conversation on this spot. */
  onAnswer: () => void;
  /** The first open card in queue order — the one to work on first. */
  startHere?: boolean;
}

export default function SpotCard({
  spot,
  active,
  missingInDraft,
  onSelect,
  onStatusChange,
  onAnswer,
  startHere = false,
}: Props) {
  // `answered` is live work, not settled work — it must not fade out.
  const dimmed = spot.status === "resolved" || spot.status === "skipped";
  const awaitingRevision = spot.status === "answered";

  return (
    /*
     * Collapsed to a line until it is the one being worked on.
     *
     * A margin of fully open cards is a wall of text competing with the essay,
     * and it forces every note far down the page to clear the one above it —
     * which is the same thing as breaking the alignment they exist for. Shut,
     * a note is a mark in the margin: weight, name, and where it sits.
     *
     * Open is not separate state. Exactly one spot is live at a time, which the
     * product already believed, so the live one is the open one and clicking a
     * note is what makes it live.
     */
    <article
      className={`rounded-lg border bg-white transition ${
        active ? "p-4" : "px-3 py-2.5"
      } ${
        awaitingRevision
          ? "border-flag-medium/60 shadow-sm"
          : active
            ? "border-accent shadow-sm"
            : "border-line hover:border-accent/50"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={active}
        className={`flex w-full gap-2 text-left ${active ? "items-start" : "items-center"}`}
      >
        {/*
          Shut, the card is an index entry and needs a name to be found by.
          Open, it leads with the line it is about.

          Measured across six drafts of one essay: the anchor is the stable
          part of a read — the same passage comes back run after run — while
          the name put on it does not. One paragraph drew "Procedural
          narration", then "A claimed link to a field that does not hold",
          then "Intellectual transition gap" on three runs of the same draft,
          and impact moved between structural/high and substantive/medium on
          passages that had not changed. The card was setting the unstable
          layer in the largest type on the page and the reliable one in small
          grey below it.
        */}
        {!active && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${IMPACT_STYLE[spot.impact]}`}
            title={IMPACT_BLURB[spot.impact]}
          >
            {IMPACT_LABEL[spot.impact]}
          </span>
        )}
        {active ? (
          <span className="min-w-0 flex-1 border-l-2 border-accent/40 pl-3 font-serif text-base leading-relaxed text-ink">
            {spot.quoted_text}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-ink">
            {spot.pattern_name}
          </span>
        )}

        {/* The read already ranked these by what a reader loses. Saying so
            costs a word and saves the student from choosing between three
            cards that look identical. Only on the closed row: once a card is
            open it is the one being worked on, and the label is noise. */}
        {startHere && !active && (
          <span className="shrink-0 text-[0.7rem] text-accent">Start here</span>
        )}

        {active ? (
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className="mt-1 shrink-0 rotate-180 text-muted"
          >
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : spot.status !== "open" ? (
          <span className="shrink-0 text-[0.7rem] text-muted">
            {STATUS_SHORT[spot.status]}
          </span>
        ) : (
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-muted"
          >
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {!active ? null : (
        <>
          {spot.status !== "open" && (
            <p className="mt-2 text-xs text-muted">
              {STATUS_LABEL[spot.status]}
            </p>
          )}

          {missingInDraft && (
            <p className="mt-2 text-xs text-flag-medium">
              This line isn&apos;t in your current draft any more — it&apos;s
              kept here from the version that was read.
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
                Your words, not ours. Work them into the quoted line above
                however you want — this closes itself once that passage changes.
              </p>
            </div>
          )}

          {/*
            Order follows what a student needs, not what the model produced.
            The gap and the question come first: which line, what is missing
            from it, what to answer. The justification — what already lands,
            what it costs — is why they should believe the finding, and it
            belongs under that rather than in front of it.

            Three shouting uppercase labels in a row made every card read as a
            form to fill in. One quiet label on the gap is enough; the rest is
            prose, which is what a reader's note actually is.
          */}
          <p className="mt-4 text-sm leading-relaxed">
            <span className="text-muted">Still unexplored — </span>
            {spot.what_is_unexplored}
          </p>

          {/*
            The question is the only part of a card a student can act on: it is
            what turns a diagnosis into something they can answer. It used to
            live on the Follow-up tab, so a card explained the problem in full
            and then sent them somewhere else to do anything about it — and the
            two buttons within reach were "resolved" and "set aside", which are
            both ways of closing it. Put next to the reasoning that earned it,
            the obvious move is the useful one.

            Hidden once the spot is settled: a resolved card asking a question
            reads as though it reopened itself.
          */}
          {spot.question && !dimmed && (
            <div className="mt-3 rounded-md border border-accent/30 bg-accent-soft/40 p-3">
              <p className="text-sm leading-relaxed">{spot.question}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnswer();
                }}
                className="mt-3 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white transition hover:bg-[#4849c8]"
              >
                {awaitingRevision ? "Back to the conversation" : "Answer this"}
              </button>
            </div>
          )}

          <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            {/* The read's own labels, kept where they can be checked and not
                where they set the tone: the name is a handle, not a verdict. */}
            <p>
              {spot.pattern_name} · {IMPACT_LABEL[spot.impact]} ·{" "}
              {spot.confidence} confidence
            </p>
            <p>
              <span className="text-ink">What already lands.</span>{" "}
              {spot.what_is_clear}
            </p>
            <p>
              <span className="text-ink">Why it matters here.</span>{" "}
              {spot.why_it_matters}
            </p>
          </div>

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
        </>
      )}
    </article>
  );
}
