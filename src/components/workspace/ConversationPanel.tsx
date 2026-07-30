"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ConversationMessage, FlaggedSpot } from "@/lib/types";

interface Props {
  essayId: string;
  messages: ConversationMessage[];
  spots: FlaggedSpot[];
  activeSpotId: string | null;
  onMessagesChange: (messages: ConversationMessage[]) => void;
  onSpotResolved: (spotId: string, status: "resolved" | "skipped") => void;
  onSelectSpot: (spotId: string) => void;
}

interface Affirmation {
  text: string;
  pattern: string;
  verdict: "resolved" | "skipped";
}

/**
 * The Socratic loop, strict single-question mode.
 *
 * Exactly one spot is live — the earliest open one in the queue — and it's the
 * only spot whose thread is on screen. Everything already resolved or set aside
 * collapses into an expandable history, so the student never faces two stacked
 * questions and never has to guess which one the input answers.
 */
export default function ConversationPanel({
  essayId,
  messages,
  spots,
  activeSpotId,
  onMessagesChange,
  onSpotResolved,
  onSelectSpot,
}: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // The engine's praise for the spot just closed. Its message now belongs to a
  // finished spot (so it lives in history), but the teaching moment shouldn't
  // vanish the instant the next question loads — keep it pinned until the
  // student answers the next one.
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openSpots = useMemo(
    () =>
      spots
        .filter((s) => s.status === "open")
        .sort((a, b) => a.queue_position - b.queue_position),
    [spots],
  );
  const currentSpot = openSpots[0] ?? null;

  // The input is bound to currentSpot, so the on-screen thread must be exactly
  // that spot's — nothing from other spots stacks in the live view.
  const currentThread = useMemo(
    () =>
      currentSpot
        ? messages.filter((m) => m.flagged_spot_id === currentSpot.id)
        : [],
    [messages, currentSpot],
  );

  const earlierMessages = useMemo(
    () =>
      currentSpot
        ? messages.filter((m) => m.flagged_spot_id !== currentSpot.id)
        : messages,
    [messages, currentSpot],
  );

  const resolvedCount = spots.filter((s) => s.status !== "open").length;
  const done = !currentSpot && spots.length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [currentThread.length, sending, affirmation]);

  // Keep the highlighted line in the editor in step with the live question.
  useEffect(() => {
    if (currentSpot) onSelectSpot(currentSpot.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpot?.id]);

  async function send() {
    const text = draft.trim();
    if (!text || !currentSpot || sending) return;

    setSending(true);
    setError(null);
    setAffirmation(null);

    const spotId = currentSpot.id;
    const optimistic: ConversationMessage = {
      id: `pending-${Date.now()}`,
      essay_id: essayId,
      flagged_spot_id: spotId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const base = [...messages, optimistic];
    onMessagesChange(base);
    setDraft("");

    try {
      const response = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayId, spotId, message: text }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "That didn't go through.");
        setSending(false);
        return;
      }

      const next: ConversationMessage[] = [
        ...base,
        {
          id: `assistant-${Date.now()}`,
          essay_id: essayId,
          flagged_spot_id: spotId,
          role: "assistant",
          content: payload.reply,
          created_at: new Date().toISOString(),
        },
      ];

      if (payload.verdict !== "needs_narrower") {
        onSpotResolved(spotId, payload.verdict);
        setAffirmation({
          text: payload.reply,
          pattern: currentSpot.pattern_name,
          verdict: payload.verdict === "skipped" ? "skipped" : "resolved",
        });
        if (payload.nextSpot) {
          next.push({
            id: `assistant-next-${Date.now()}`,
            essay_id: essayId,
            flagged_spot_id: payload.nextSpot.id,
            role: "assistant",
            content: payload.nextSpot.question,
            created_at: new Date().toISOString(),
          });
        }
      }

      onMessagesChange(next);
    } catch {
      setError("Couldn't reach the server. Your message is saved — try again.");
    } finally {
      setSending(false);
    }
  }

  const spotPattern = (spotId: string | null) =>
    spotId ? (spots.find((s) => s.id === spotId)?.pattern_name ?? null) : null;

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-serif text-base">Follow-up</h2>
          <p className="text-xs text-muted">
            {currentSpot
              ? `One question at a time · ${openSpots.length} left`
              : done
                ? "Every spot has been worked through."
                : "Run a read first."}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            When Essence reads your draft, the first question lands here. Answers
            you give become raw material for you to write with — nothing here
            gets pasted into your essay for you.
          </p>
        )}

        {/* Everything already settled folds away so only the live question shows. */}
        {earlierMessages.length > 0 && (
          <div className="rounded-lg border border-line/70 bg-paper/60">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs text-muted hover:text-ink"
            >
              <span>
                Earlier questions ({resolvedCount || "history"})
              </span>
              <span>{showHistory ? "Hide" : "Show"}</span>
            </button>
            {showHistory && (
              <div className="space-y-3 border-t border-line/70 p-3">
                {earlierMessages.map((message) => (
                  <Bubble
                    key={message.id}
                    message={message}
                    label={spotPattern(message.flagged_spot_id)}
                    activeSpotId={activeSpotId}
                    onSelectSpot={onSelectSpot}
                    faded
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* The praise for the spot just closed, kept visible over the handoff. */}
        {affirmation && (
          <div className="rounded-lg border border-flag-low/40 bg-flag-low/10 p-3 text-sm">
            <p className="text-xs uppercase tracking-widest text-flag-low">
              {affirmation.verdict === "resolved"
                ? `Locked in · ${affirmation.pattern}`
                : `Set aside · ${affirmation.pattern}`}
            </p>
            <p className="mt-1 leading-relaxed">{affirmation.text}</p>
          </div>
        )}

        {/* The live spot: what the input answers, stated plainly. */}
        {currentSpot && (
          <div className="rounded-lg border border-accent/30 bg-accent-soft/30 px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-accent">
              Answering · {currentSpot.pattern_name}
            </p>
            <blockquote className="mt-1 border-l-2 border-accent/40 pl-2 font-serif text-sm leading-snug text-muted">
              {currentSpot.quoted_text}
            </blockquote>
          </div>
        )}

        {currentThread.map((message) => (
          <Bubble
            key={message.id}
            message={message}
            label={null}
            activeSpotId={activeSpotId}
            onSelectSpot={onSelectSpot}
          />
        ))}

        {done && (
          <p className="rounded-lg border border-dashed border-line bg-paper/60 p-4 text-sm text-muted">
            That&apos;s every open question. Reopen a spot from its card if you
            want to revisit it, edit your draft, or run another read.
          </p>
        )}

        {sending && (
          <div className="flex items-center gap-1.5 px-1 text-muted">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-current" />
            <span
              className="typing-dot h-1.5 w-1.5 rounded-full bg-current"
              style={{ animationDelay: "0.2s" }}
            />
            <span
              className="typing-dot h-1.5 w-1.5 rounded-full bg-current"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mx-4 mb-2 rounded-md bg-flag-high/10 px-3 py-2 text-xs text-flag-high">
          {error}
        </p>
      )}

      <div className="border-t border-line p-3">
        {currentSpot && (
          <p className="mb-2 text-xs text-muted">
            Answering{" "}
            <span className="font-medium text-accent">
              {currentSpot.pattern_name}
            </span>
          </p>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          disabled={!currentSpot || sending}
          placeholder={
            currentSpot
              ? "Answer with one concrete thing — what happened, who was there, when."
              : "No open questions right now."
          }
          className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-paper disabled:text-muted"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted">⌘/Ctrl + Enter to send</span>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!currentSpot || sending || !draft.trim()}
            className="rounded-full bg-accent px-4 py-1.5 text-sm text-paper transition hover:opacity-90 disabled:opacity-40"
          >
            {sending ? "Thinking…" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  message,
  label,
  activeSpotId,
  onSelectSpot,
  faded = false,
}: {
  message: ConversationMessage;
  label: string | null;
  activeSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
  faded?: boolean;
}) {
  const mine = message.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${mine ? "text-right" : ""} ${faded ? "opacity-80" : ""}`}>
        {!mine && label && (
          <button
            type="button"
            onClick={() =>
              message.flagged_spot_id && onSelectSpot(message.flagged_spot_id)
            }
            className={`mb-1 text-xs underline-offset-2 hover:underline ${
              message.flagged_spot_id === activeSpotId
                ? "text-accent"
                : "text-muted"
            }`}
          >
            {label}
          </button>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            mine
              ? "bg-ink text-paper"
              : "border border-line bg-paper text-ink"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
