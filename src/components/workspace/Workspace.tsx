"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DraftEditor from "./DraftEditor";
import SpotCard from "./SpotCard";
import KeepCard from "./KeepCard";
import FirstRunGuide from "./FirstRunGuide";
import ConversationPanel from "./ConversationPanel";
import EssaySettings from "./EssaySettings";
import Markdown from "@/components/Markdown";
import { saveDraft, saveVersion, setSpotStatus } from "@/app/actions";
import { locateQuote } from "@/lib/ai/parseReport";
import {
  countWords,
  deriveReadiness,
  isAtRest,
  DIMINISHING_RETURNS_ROUND,
  SUPPRESS_POLISH_FROM_ROUND,
  minimumWordsForEssay,
  type ConversationMessage,
  type Essay,
  type EssayReport,
  type FlaggedSpot,
  type Readiness,
  type SpotStatus,
} from "@/lib/types";

interface Props {
  essay: Essay;
  initialSpots: FlaggedSpot[];
  initialMessages: ConversationMessage[];
  report: EssayReport | null;
  /** False when the active provider's terms permit training on submitted text. */
  paidTier: boolean;
}

type Tab = "spots" | "report" | "followup";

export default function Workspace({
  essay,
  initialSpots,
  initialMessages,
  report: initialReport,
  paidTier,
}: Props) {
  const router = useRouter();

  const [draft, setDraft] = useState(essay.current_draft ?? "");
  const [spots, setSpots] = useState(initialSpots);
  const [messages, setMessages] = useState(initialMessages);
  const [report, setReport] = useState(initialReport);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(
    initialSpots.find((s) => s.status === "open")?.id ?? null,
  );
  const [tab, setTab] = useState<Tab>("spots");
  const [showMinor, setShowMinor] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [analysing, setAnalysing] = useState(false);
  const [banner, setBanner] = useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);

  const words = countWords(draft);
  const minimumWords = minimumWordsForEssay(essay.essay_kind);
  const tooShort = words < minimumWords;
  // Recomputed from the live spots rather than read off the stored report, so
  // resolving the last substantive card updates the verdict immediately.
  const readiness = deriveReadiness(spots);

  /** The one note being worked on, rendered under the draft rather than beside it. */
  const openSpot = spots.find((s) => s.id === activeSpotId) ?? null;

  /*
   * A long draft puts the open note far below the fold, so choosing one in the
   * margin index would otherwise appear to do nothing at all.
   */
  const openNoteRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activeSpotId) return;
    openNoteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSpotId]);

  /*
   * The switcher sits at the top of the reading column and what it switches
   * sits under the draft, so pressing a tab on a 600-word essay changed
   * something two screens below the fold. Not on the first render: arriving
   * at a draft should show the draft.
   */
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    openNoteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tab]);
  const atRest = isAtRest(readiness, Boolean(essay.last_feedback_at));
  const rounds = essay.revision_count ?? 0;
  const openCount = spots.filter((s) => s.status === "open").length;
  const resolvedCount = spots.filter((s) => s.status === "resolved").length;

  // Debounced autosave. Versions are explicit; this just keeps the draft safe.
  const dirty = useRef(false);
  useEffect(() => {
    if (draft === (essay.current_draft ?? "") && !dirty.current) return;
    dirty.current = true;
    setSaving("saving");

    const timer = setTimeout(async () => {
      const result = await saveDraft(essay.id, draft);
      setSaving(result.ok ? "saved" : "error");
    }, 900);

    return () => clearTimeout(timer);
  }, [draft, essay.id, essay.current_draft]);

  const runFeedback = useCallback(async () => {
    if (analysing || tooShort) return;
    setAnalysing(true);
    setBanner(null);

    try {
      // Flush the draft first — the server reads it from the database.
      await saveDraft(essay.id, draft);

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayId: essay.id }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setBanner({
          kind: "error",
          text: payload.error ?? "The read didn't go through.",
        });
        return;
      }

      if (payload.truncated) {
        // Never let a cut-off read masquerade as a clean bill of health.
        setBanner({
          kind: "error",
          text: "Essence didn't get to the end of this read, so the flagged spots and questions are missing or incomplete. Try again — if it keeps happening, a shorter draft will get through.",
        });
      } else if (payload.draftUnchanged) {
        setBanner({
          kind: "info",
          text: "This draft hasn't changed since the last read, so the findings haven't either. Reading again won't move it — revising will.",
        });
      } else if (payload.spotCount === 0) {
        // A barren re-read leaves the previous cards in place, so say that
        // rather than letting an empty result look like a clean essay.
        setBanner({
          kind: "info",
          text:
            spots.length > 0
              ? "This read came back with no new spots, so your existing ones are still here. The full diagnostic is on the Full read tab."
              : "No spots flagged this time — read the full diagnostic on the Full read tab.",
        });
      } else {
        const notes: string[] = [`${payload.spotCount} spots flagged.`];
        if (payload.carriedOver > 0) {
          notes.push(
            `${payload.carriedOver} you'd already settled stayed closed.`,
          );
        }
        if (payload.droppedCount > 0) {
          notes.push(
            `${payload.droppedCount} were dropped because their quote didn't match your draft exactly.`,
          );
        }
        if (notes.length > 1) {
          setBanner({ kind: "info", text: notes.join(" ") });
        }
      }

      // The server wrote spots, the report and the opening question — pull the
      // authoritative state rather than reconstructing it here.
      router.refresh();
    } catch {
      setBanner({ kind: "error", text: "Couldn't reach the server." });
    } finally {
      setAnalysing(false);
    }
  }, [analysing, tooShort, essay.id, draft, router, spots.length]);

  // Re-sync when router.refresh() brings new server data down.
  useEffect(() => setSpots(initialSpots), [initialSpots]);
  useEffect(() => setMessages(initialMessages), [initialMessages]);
  useEffect(() => setReport(initialReport), [initialReport]);
  useEffect(() => {
    setActiveSpotId((current) => {
      if (current && initialSpots.some((s) => s.id === current)) return current;
      return initialSpots.find((s) => s.status === "open")?.id ?? null;
    });
  }, [initialSpots]);

  /*
   * Closes the loop on revision rather than conversation.
   *
   * A spot sits at `answered` once the student has produced the material but
   * the draft still reads as it did. Each card is anchored to an exact line, so
   * when that line stops appearing in the draft the passage has been rewritten
   * — that, and not a good chat answer, is what earns `resolved`.
   */
  useEffect(() => {
    const answered = spots.filter((s) => s.status === "answered");
    if (answered.length === 0) return;

    const timer = setTimeout(() => {
      for (const spot of answered) {
        if (locateQuote(draft, spot.quoted_text)) continue;
        setSpots((prev) =>
          prev.map((s) =>
            s.id === spot.id ? { ...s, status: "resolved" as SpotStatus } : s,
          ),
        );
        void setSpotStatus(spot.id, "resolved");
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [draft, spots]);

  async function changeStatus(spotId: string, status: SpotStatus) {
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, status } : s)),
    );
    const result = await setSpotStatus(spotId, status);
    if (!result.ok) {
      setBanner({ kind: "error", text: result.error });
      router.refresh();
    }
  }

  async function handleSaveVersion() {
    const result = await saveVersion(essay.id);
    setBanner(
      result.ok
        ? { kind: "info", text: "Version saved to your history." }
        : { kind: "error", text: result.error },
    );
  }

  const ordered = [...spots].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return a.queue_position - b.queue_position;
  });

  /*
   * From round 3 on, taste-level notes are collapsed away. By then a student is
   * looking for a reason to keep editing, and a list padded with cosmetic notes
   * supplies one — this keeps the default view to findings that would actually
   * change a reader's impression.
   */
  // Only shown while they still match the draft — a passage the student has
  // since rewritten is no longer the passage that was working.
  const keepList = (report?.working_well ?? []).filter((item) =>
    locateQuote(draft, item.quote),
  );

  const hidePolish = rounds >= SUPPRESS_POLISH_FROM_ROUND;
  const minorSpots = hidePolish
    ? ordered.filter((s) => s.impact === "polish" && s.status === "open")
    : [];
  const primarySpots = ordered.filter((s) => !minorSpots.includes(s));

  /*
   * The queue is already ordered by what the reader loses, so the first open
   * card is the one to start with — but on screen every card looked the same
   * weight, and choosing between three equals is work the read already did.
   */
  const startHereId = primarySpots.find((s) => s.status === "open")?.id ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky: a session here runs for an hour and the draft scrolls a long
          way, so "Get feedback" and the word count have to stay reachable
          without a trip back to the top. */}
      <div className="nav-blur sticky top-0 z-30 border-b border-line">
        <div className="mx-auto flex max-w-[68rem] flex-wrap items-center justify-between gap-3 px-6 py-3 min-[1500px]:max-w-[82rem]">
          <div className="min-w-0">
            <h1 className="display truncate text-xl">{essay.title}</h1>
            <p className="text-xs uppercase tracking-widest text-muted">
              {essay.essay_kind === "supplemental"
                ? "Supplemental"
                : "Personal statement"}
              {essay.school ? ` · ${essay.school}` : ""}
              {essay.last_feedback_at
                ? ` · ${openCount} open, ${resolvedCount} resolved`
                : " · not read yet"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/essays/${essay.id}/history`}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent"
            >
              History
            </Link>
            <button
              type="button"
              onClick={handleSaveVersion}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent"
            >
              Save version
            </button>
            {/* At rest the button stops inviting another round: the loop of
                re-reading a finished essay is how good drafts get sanded down. */}
            <button
              type="button"
              onClick={runFeedback}
              disabled={analysing || tooShort}
              title={
                tooShort
                  ? `Write at least ${minimumWords} words first.`
                  : atRest
                    ? "This draft is already at rest — another read is unlikely to help."
                    : undefined
              }
              className={`rounded-full px-5 py-2 text-sm transition disabled:opacity-40 ${
                atRest
                  ? "border border-line text-muted hover:border-accent hover:text-ink"
                  : "bg-accent text-paper hover:opacity-90"
              }`}
            >
              {analysing
                ? "Reading…"
                : atRest
                  ? "Read again anyway"
                  : essay.last_feedback_at
                    ? "Read again"
                    : "Get feedback"}
            </button>
          </div>
        </div>

        <FirstRunGuide />

        {/* When the provider's terms permit training on submitted text, say so
            where drafts get pasted — not only on a privacy page nobody opens.

            Deliberately still here, and deliberately no longer red. A warning
            that shouts on every visit to a room you spend an hour in stops
            being read after the second day, and this one has to survive being
            seen daily: it is the difference between a student knowing where
            their essay goes and not. Quiet and permanent beats loud and
            tuned out. */}
        {!paidTier && (
          <p className="border-t border-line bg-paper px-6 py-2 text-xs text-muted">
            <span aria-hidden="true" className="mr-1.5 text-flag-medium">
              ●
            </span>
            Free Gemini tier: Google may use what you paste to improve its
            products, and human reviewers may read it.{" "}
            <Link
              href="/settings"
              className="text-ink underline underline-offset-2"
            >
              What this means
            </Link>
          </p>
        )}

        {tooShort && (
          <p className="border-t border-line bg-accent-soft/40 px-6 py-2 text-xs text-accent">
            {words === 0
              ? `Paste a draft to get started — Essence needs at least ${minimumWords} words.`
              : `${words} of ${minimumWords} words. A little more and Essence can read it properly.`}
          </p>
        )}

        {banner && (
          <p
            className={`border-t border-line px-6 py-2 text-xs ${
              banner.kind === "error"
                ? "bg-flag-high/10 text-flag-high"
                : "bg-accent-soft/40 text-accent"
            }`}
          >
            {banner.text}
          </p>
        )}
      </div>

      {/* The draft sits on a sheet in the measure; the margin runs beside it.
          Neither scrolls internally — the page does — because a note can only
          stay level with its line if the line and the note move together. */}
      {/*
        The draft column is capped on purpose. Line length is the one
        typographic setting that changes whether a page gets read: at 40rem
        this serif runs about 75 characters, which is already the top of the
        comfortable range, and stretching it to fill a 1920px monitor would
        make the essay harder to read, not easier.

        What the extra width is for instead: past 1500px the page grows to
        82rem and the margin takes it, going from 23rem to 28rem. The index
        stops truncating pattern names, the verdict stops wrapping every
        other word, and the two columns stop looking marooned in the middle
        of the screen — without moving the text itself.
      */}
      <div className="mx-auto grid w-full max-w-[68rem] gap-8 px-6 py-8 min-[1180px]:grid-cols-[minmax(0,40rem)_23rem] min-[1500px]:max-w-[82rem] min-[1500px]:gap-12 min-[1500px]:grid-cols-[minmax(0,44rem)_28rem]">
        <div className="flex flex-col gap-4">
          {/*
            The switcher moved here from the margin, because its content did.
            Pressing a control on the right and watching a different column
            change on the left is a puzzle a student solves once per session
            and resents every time; a control belongs above what it controls.

            "Full read" said nothing about what was inside it, so testers kept
            assuming the framework and strengths had gone missing. The labels
            name their contents.
          */}
          <div className="nav-blur sticky top-[4.5rem] z-20 flex gap-1 rounded-full border border-line p-1 text-sm">
            {(
              [
                [
                  "spots",
                  `Spots${spots.length ? ` (${spots.length})` : ""}`,
                  "Specific lines to work on",
                ],
                ["report", "Full read", "Structure and strengths"],
                [
                  "followup",
                  `Follow-up${openCount ? ` (${openCount})` : ""}`,
                  "Questions and your answers",
                ],
              ] as [Tab, string, string][]
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                title={hint}
                className={`flex-1 rounded-full px-3 py-1.5 leading-tight transition ${
                  tab === value
                    ? "bg-ink text-paper"
                    : "text-muted hover:text-ink"
                }`}
              >
                <span className="block">{label}</span>
                <span
                  className={`block text-[0.65rem] ${
                    tab === value ? "text-paper/70" : "text-muted"
                  }`}
                >
                  {hint}
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-line bg-white px-6 py-4 sm:px-8 sm:py-6">
            <DraftEditor
              value={draft}
              onChange={setDraft}
              spots={spots}
              activeSpotId={activeSpotId}
              onSelectSpot={setActiveSpotId}
              wordLimit={essay.word_limit}
              saving={saving}
              minimumWords={minimumWords}
            />
          </div>

          {/*
            The open note sits under the draft, in the same column and at the
            same measure as the text it is about.

            It used to open in the margin. Notes there are stacked rather than
            level with their lines — aligning them left gaps between cards
            bigger than the cards — so the column was neither beside its line
            nor in the reading path, and following a note meant crossing the
            full width of the screen and coming back. Underneath, the eye
            travels the way it already reads.

            The margin keeps the collapsed cards, which is what it is good at:
            an index you scan, not prose you read.
          */}


          {/*
            Everything with sentences in it reads here, under the draft, at the
            measure of the text. The margin is the index and the verdict: it is
            scanned, not read.

            The conversation was the last thing left over there, and it is the
            part a student spends the most time in — one question at a time,
            their own answers coming back — in the narrowest column on the page.
          */}
          {tab === "followup" ? (
            <div ref={openNoteRef} className="flex min-h-0 flex-col">
              <ConversationPanel
                essayId={essay.id}
                messages={messages}
                spots={spots}
                activeSpotId={activeSpotId}
                onMessagesChange={setMessages}
                onSpotResolved={(spotId, status) =>
                  setSpots((prev) =>
                    prev.map((s) => (s.id === spotId ? { ...s, status } : s)),
                  )
                }
                onSelectSpot={setActiveSpotId}
              />
            </div>
          ) : tab === "report" ? (
            <div ref={openNoteRef}>
              {report ? (
                <div className="space-y-5 rounded-lg border border-line bg-white p-5">
                  <ReportSection
                    title="Overall impression"
                    body={report.overall_impression}
                  />
                  <ReportSection
                    title="Checklist findings"
                    body={report.checklist_findings}
                  />
                  <ReportSection
                    title="Framework findings"
                    body={report.framework_findings}
                  />
                  <ReportSection
                    title="Why this essay works"
                    body={report.strengths}
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-muted">
                  The full structural read appears here after your first
                  feedback run.
                </p>
              )}
            </div>
          ) : (
            openSpot && (
              <div ref={openNoteRef}>
                <SpotCard
                  spot={openSpot}
                  active
                  missingInDraft={!locateQuote(draft, openSpot.quoted_text)}
                  onSelect={() => setActiveSpotId(null)}
                  onStatusChange={(status) => changeStatus(openSpot.id, status)}
                  onAnswer={() => setTab("followup")}
                />
              </div>
            )
          )}

          {/*
            What not to change is prose too, and it was being read out of the
            margin like everything else. It belongs under the draft with the
            notes: same column, same measure, read in the same direction.

            Not behind a tab, and not conditional on which one is open — this is
            the only thing on the screen saying which passages to protect, and a
            student deciding what to cut needs it in front of them whatever they
            were doing a moment ago.
          */}
          {keepList.length > 0 && (
            <div className="space-y-3">
              {keepList.map((item, i) => (
                <KeepCard key={`keep-${i}`} item={item} />
              ))}
            </div>
          )}

          <EssaySettings essay={essay} />
        </div>

        {/* Notes used to be slid down to sit level with their quotes. Seen at
            full size that spent most of the column on blank paper — the gaps
            between cards were larger than the cards. They stack together now,
            and the connection to the text is made on demand instead: selecting
            a card scrolls its line into view.

            Sticky, with its own scroll, so the notes stay put while a long
            draft moves past them. */}
        <div className="flex flex-col gap-4 min-[1180px]:sticky min-[1180px]:top-[5.5rem] min-[1180px]:max-h-[calc(100vh-7rem)] min-[1180px]:overflow-y-auto min-[1180px]:pr-1">


          <div className="space-y-3">
              {essay.last_feedback_at && (
                <ReadinessCard readiness={readiness} report={report} />
              )}

              {/* Rounds are never blocked — the cost is just made visible. */}
              {rounds >= DIMINISHING_RETURNS_ROUND && (
                <p className="rounded-lg border border-flag-medium/40 bg-flag-medium/10 p-3 text-xs text-ink">
                  {/* Built as one string: interpolating a count between JSX text
                    nodes swallowed the space after it and rendered "4rounds". */}
                  {`You've run ${rounds} rounds of feedback on this essay. Most essays stop improving after 3–4 rounds and start losing voice. Here's what's still open — decide whether it's worth it.`}
                </p>
              )}

              {spots.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-muted">
                    No flagged spots yet. Paste your draft and press{" "}
                    <span className="text-ink">Get feedback</span> — Essence
                    reads the whole essay in one pass, then works through what
                    it found one question at a time.
                  </p>
                ) : (
                  <>
                    {primarySpots.map((spot) => (
                      <SpotCard
                        key={spot.id}
                        spot={spot}
                        active={false}
                        startHere={spot.id === startHereId}
                        missingInDraft={!locateQuote(draft, spot.quoted_text)}
                        onSelect={() => setActiveSpotId(spot.id)}
                        onStatusChange={(status) =>
                          changeStatus(spot.id, status)
                        }
                        onAnswer={() => {
                          setActiveSpotId(spot.id);
                          setTab("followup");
                        }}
                      />
                    ))}

                    {minorSpots.length > 0 && (
                      <div className="rounded-lg border border-line bg-white">
                        <button
                          type="button"
                          onClick={() => setShowMinor((v) => !v)}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm"
                        >
                          <span className="text-muted">
                            Minor notes ({minorSpots.length})
                          </span>
                          <span className="text-xs text-muted">
                            {showMinor ? "Hide" : "Show"}
                          </span>
                        </button>
                        {showMinor && (
                          <div className="space-y-3 border-t border-line p-3">
                            <p className="text-xs text-muted">
                              Taste, not improvement. Safe to ignore entirely.
                            </p>
                            {minorSpots.map((spot) => (
                              <SpotCard
                                key={spot.id}
                                spot={spot}
                                active={false}
                                missingInDraft={
                                  !locateQuote(draft, spot.quoted_text)
                                }
                                onSelect={() => setActiveSpotId(spot.id)}
                                onStatusChange={(status) =>
                                  changeStatus(spot.id, status)
                                }
                                onAnswer={() => {
                                  setActiveSpotId(spot.id);
                                  setTab("followup");
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}

const READINESS_COPY: Record<
  Readiness,
  { label: string; blurb: string; tone: string }
> = {
  needs_work: {
    label: "Needs work",
    blurb: "Something structural still affects whether the essay lands.",
    tone: "border-flag-high/40 bg-flag-high/10 text-flag-high",
  },
  strong: {
    label: "Strong",
    blurb: "Nothing structural left — some moments still need real material.",
    tone: "border-flag-medium/40 bg-flag-medium/10 text-flag-medium",
  },
  ready_to_submit: {
    label: "Ready to submit",
    blurb: "What's left is taste, not improvement.",
    tone: "border-flag-low/50 bg-flag-low/15 text-flag-low",
  },
};

/**
 * The stopping signal, and the visual focus of the results.
 *
 * Without it the tool has no endpoint — it is built to find weaknesses, so it
 * finds them forever, and students circle between fixes until the essay loses
 * whatever made it theirs. At `ready_to_submit` this says so in the largest
 * type on the panel, because "you can stop" is the finding that matters most.
 */
function ReadinessCard({
  readiness,
  report,
}: {
  readiness: Readiness;
  report: EssayReport | null;
}) {
  const copy = READINESS_COPY[readiness];
  const ready = readiness === "ready_to_submit";

  return (
    <section className={`rounded-lg border p-4 ${copy.tone}`}>
      <h2 className={ready ? "display text-xl" : "display text-base"}>
        {copy.label}
      </h2>
      <p className="mt-0.5 text-xs opacity-90">{copy.blurb}</p>

      {report?.readiness_why && (
        <p className="mt-3 text-sm text-ink">{report.readiness_why}</p>
      )}

      {ready ? (
        <p className="mt-3 text-sm font-medium text-ink">
          {report?.readiness_next ||
            "This is ready. What's left is taste, not improvement — further edits risk flattening your voice more than they help."}
        </p>
      ) : (
        report?.readiness_next && (
          <p className="mt-2 text-sm font-medium text-ink">
            {report.readiness_next}
          </p>
        )
      )}
    </section>
  );
}

function ReportSection({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-muted">{title}</h2>
      <div className="mt-2">
        <Markdown source={body} />
      </div>
    </section>
  );
}
