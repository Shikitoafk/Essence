"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DraftEditor from "./DraftEditor";
import SpotCard from "./SpotCard";
import ConversationPanel from "./ConversationPanel";
import EssaySettings from "./EssaySettings";
import Markdown from "@/components/Markdown";
import { saveDraft, saveVersion, setSpotStatus } from "@/app/actions";
import { locateQuote } from "@/lib/ai/parseReport";
import {
  countWords,
  shouldStopReading,
  MIN_DRAFT_WORDS,
  type ConversationMessage,
  type Essay,
  type EssayReport,
  type FlaggedSpot,
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

type Tab = "spots" | "report";

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
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [analysing, setAnalysing] = useState(false);
  const [banner, setBanner] = useState<
    { kind: "error" | "info"; text: string } | null
  >(null);

  const words = countWords(draft);
  const tooShort = words < MIN_DRAFT_WORDS;
  const atRest = shouldStopReading(report?.readiness ?? null);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[110rem] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl">{essay.title}</h1>
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
                  ? `Write at least ${MIN_DRAFT_WORDS} words first.`
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

        {/* When the provider's terms permit training on submitted text, say so
            where drafts get pasted — not only on a privacy page nobody opens. */}
        {!paidTier && (
          <p className="border-t border-line bg-flag-high/10 px-6 py-2 text-xs text-flag-high">
            This app runs on Google&apos;s free Gemini tier: Google may use what
            you paste to improve its products, and human reviewers may read it.{" "}
            <Link href="/settings" className="underline underline-offset-2">
              What this means
            </Link>
          </p>
        )}

        {tooShort && (
          <p className="border-t border-line bg-accent-soft/40 px-6 py-2 text-xs text-accent">
            {words === 0
              ? `Paste a draft to get started — Essence needs at least ${MIN_DRAFT_WORDS} words.`
              : `${words} of ${MIN_DRAFT_WORDS} words. A little more and Essence can read it properly.`}
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

      <div className="mx-auto grid min-h-0 w-full max-w-[110rem] flex-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-[26rem] flex-1 flex-col overflow-hidden rounded-lg border border-line bg-white">
            <DraftEditor
              value={draft}
              onChange={setDraft}
              spots={spots}
              activeSpotId={activeSpotId}
              onSelectSpot={setActiveSpotId}
              wordLimit={essay.word_limit}
              saving={saving}
            />
          </div>
          <EssaySettings essay={essay} />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex gap-1 rounded-full border border-line bg-white p-1 text-sm">
            {(
              [
                ["spots", `Spots${spots.length ? ` (${spots.length})` : ""}`],
                ["report", "Full read"],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`flex-1 rounded-full px-3 py-1.5 transition ${
                  tab === value ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {report?.readiness && <ReadinessCard report={report} />}

            {tab === "spots" ? (
              spots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-muted">
                  No flagged spots yet. Paste your draft and press{" "}
                  <span className="text-ink">Get feedback</span> — Essence reads
                  the whole essay in one pass, then works through what it found
                  one question at a time.
                </p>
              ) : (
                ordered.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    active={spot.id === activeSpotId}
                    missingInDraft={!locateQuote(draft, spot.quoted_text)}
                    onSelect={() => setActiveSpotId(spot.id)}
                    onStatusChange={(status) => changeStatus(spot.id, status)}
                  />
                ))
              )
            ) : report ? (
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
                <ReportSection title="Top priorities" body={report.priorities} />
                <ReportSection
                  title="Why this essay works"
                  body={report.strengths}
                />
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-muted">
                The full structural read appears here after your first feedback
                run.
              </p>
            )}
          </div>

          <div className="flex min-h-[22rem] flex-col">
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
        </div>
      </div>
    </div>
  );
}

const READINESS_COPY: Record<
  string,
  { label: string; blurb: string; tone: string }
> = {
  structural: {
    label: "Structural work left",
    blurb: "Something fundamental still needs deciding.",
    tone: "border-flag-high/40 bg-flag-high/10 text-flag-high",
  },
  developmental: {
    label: "Developmental work left",
    blurb: "The bones are right; specific moments need real material.",
    tone: "border-flag-medium/40 bg-flag-medium/10 text-flag-medium",
  },
  polish: {
    label: "Only polish left",
    blurb: "What remains is taste, and it's yours to settle.",
    tone: "border-flag-low/40 bg-flag-low/10 text-flag-low",
  },
  done: {
    label: "This essay is done",
    blurb: "More editing is likelier to hurt it than help.",
    tone: "border-flag-low/50 bg-flag-low/15 text-flag-low",
  },
};

/**
 * The stopping signal, given the most prominent position in the panel.
 *
 * Without it the tool has no endpoint — it is built to find weaknesses, so it
 * finds them forever, and students circle between fixes until the essay loses
 * whatever made it theirs.
 */
function ReadinessCard({ report }: { report: EssayReport }) {
  const copy = READINESS_COPY[report.readiness ?? ""];
  if (!copy) return null;

  return (
    <section className={`rounded-lg border p-4 ${copy.tone}`}>
      <h2 className="font-serif text-base">{copy.label}</h2>
      <p className="mt-0.5 text-xs opacity-90">{copy.blurb}</p>

      {report.readiness_why && (
        <p className="mt-3 text-sm text-ink">{report.readiness_why}</p>
      )}
      {report.readiness_next && (
        <p className="mt-2 text-sm font-medium text-ink">
          {report.readiness_next}
        </p>
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
