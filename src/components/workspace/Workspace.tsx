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
          text: "The model ran out of room before finishing this read, so the flagged spots and questions are missing or incomplete. Run it again — if it keeps happening, the essay may be too long for the current model.",
        });
      } else if (payload.spotCount === 0) {
        setBanner({
          kind: "info",
          text: "No spots flagged this time — read the full diagnostic on the Full read tab.",
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
  }, [analysing, tooShort, essay.id, draft, router]);

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
            <button
              type="button"
              onClick={runFeedback}
              disabled={analysing || tooShort}
              title={
                tooShort
                  ? `Write at least ${MIN_DRAFT_WORDS} words first.`
                  : undefined
              }
              className="rounded-full bg-accent px-5 py-2 text-sm text-paper transition hover:opacity-90 disabled:opacity-40"
            >
              {analysing
                ? "Reading…"
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
