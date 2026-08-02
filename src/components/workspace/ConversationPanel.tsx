"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { askNextQuestion } from "@/app/actions";
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
  /** Specifics the student just surfaced that aren't in the draft yet. */
  newMaterial: string[];
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
  const [asking, setAsking] = useState(false);
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

  // A question only counts as live once it's actually in the thread. Until the
  // student presses the button, the current spot exists but hasn't been asked,
  // and the input stays shut.
  const asked = currentThread.some((m) => m.role === "assistant");
  const canAnswer = Boolean(currentSpot) && asked;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [currentThread.length, sending, affirmation]);

  // Keep the highlighted line in the editor in step with the live question.
  useEffect(() => {
    if (currentSpot) onSelectSpot(currentSpot.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpot?.id]);

  /**
   * `ask` sends the message as a question to the engine instead of an answer:
   * nothing is judged, the queue doesn't advance, the spot keeps its status.
   * Without it every message counted as an answer and there was no way to say
   * "I don't understand what you're asking me for".
   */
  async function send(intent: "answer" | "ask" = "answer") {
    const text = draft.trim();
    if (!text || !currentSpot || sending) return;

    setSending(true);
    setError(null);
    if (intent === "answer") setAffirmation(null);

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
        body: JSON.stringify({ essayId, spotId, message: text, intent }),
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

      // A question changes nothing about the spot — it just gets answered.
      if (intent === "ask") {
        onMessagesChange(next);
        return;
      }

      if (payload.verdict !== "needs_narrower") {
        onSpotResolved(spotId, payload.verdict);
        setAffirmation({
          text: payload.reply,
          pattern: currentSpot.pattern_name,
          verdict: payload.verdict === "skipped" ? "skipped" : "resolved",
          newMaterial: Array.isArray(payload.newMaterial)
            ? payload.newMaterial
            : [],
        });
        // The next question is NOT added here. It arrives only when the student
        // presses the button below.
      }

      onMessagesChange(next);
    } catch {
      setError("Couldn't reach the server. Your message is saved — try again.");
    } finally {
      setSending(false);
    }
  }

  async function requestNextQuestion() {
    if (!currentSpot || asking) return;
    setAsking(true);
    setError(null);

    const result = await askNextQuestion(essayId, currentSpot.id);
    if (!result.ok) {
      setError(result.error);
      setAsking(false);
      return;
    }

    // Guard against a double press stacking the same question in the thread.
    const alreadyThere = messages.some(
      (m) => m.flagged_spot_id === result.spotId && m.role === "assistant",
    );
    if (!alreadyThere) {
      onMessagesChange([
        ...messages,
        {
          id: `question-${result.spotId}-${Date.now()}`,
          essay_id: essayId,
          flagged_spot_id: result.spotId,
          role: "assistant",
          content: result.question,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    // Clearing this hands the screen over to the new question.
    setAffirmation(null);
    onSelectSpot(result.spotId);
    setAsking(false);
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
              ? canAnswer
                ? `One question at a time · ${openSpots.length} left`
                : `${openSpots.length} question${openSpots.length === 1 ? "" : "s"} waiting · you decide when`
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
                ? `Your material · ${affirmation.pattern}`
                : `Set aside · ${affirmation.pattern}`}
            </p>
            <p className="mt-1 leading-relaxed">{affirmation.text}</p>

            {/* Handed straight back as raw specifics. This is the ingredient
                list, never a draft — the writing stays the student's. */}
            {affirmation.newMaterial.length > 0 && (
              <div className="mt-3 border-t border-flag-low/30 pt-3">
                <p className="text-xs uppercase tracking-widest text-flag-low">
                  What you just turned up
                </p>
                <ul className="mt-1.5 space-y-1">
                  {affirmation.newMaterial.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-flag-low">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  None of it is in your essay yet. The card on the right stays
                  amber until you&apos;ve worked it into that line.
                </p>
              </div>
            )}
          </div>
        )}

        {/* The live spot: what the input answers, stated plainly. */}
        {currentSpot && asked && (
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

        {/* The only way a question ever reaches the thread. */}
        {currentSpot && !asked && (
          <div className="rounded-lg border border-dashed border-accent/40 bg-paper/60 p-4 text-center">
            <p className="text-sm text-muted">
              {messages.length === 0
                ? `${openSpots.length} spot${openSpots.length === 1 ? "" : "s"} to work through. Take the first question when you're ready.`
                : `Next up: ${currentSpot.pattern_name}. ${openSpots.length} left.`}
            </p>
            <button
              type="button"
              onClick={() => void requestNextQuestion()}
              disabled={asking}
              className="mt-3 rounded-full bg-accent px-5 py-2 text-sm text-paper transition hover:opacity-90 disabled:opacity-40"
            >
              {asking ? "Getting it…" : "New question"}
            </button>
          </div>
        )}

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
        {canAnswer && currentSpot && (
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
          disabled={!canAnswer || sending}
          placeholder={
            canAnswer
              ? "Answer with one concrete thing — or ask Essence something instead."
              : currentSpot
                ? "Press New question when you're ready."
                : "No open questions right now."
          }
          className="w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-paper disabled:text-muted"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted">⌘/Ctrl + Enter to answer</span>
          <div className="flex items-center gap-2">
            {/* The conversation used to run one way: everything a student typed
                counted as an answer, so "I don't understand this" was
                unsendable. Asking is now its own action. */}
            <button
              type="button"
              onClick={() => void send("ask")}
              disabled={!canAnswer || sending || !draft.trim()}
              title="Ask about this spot instead of answering — nothing gets marked either way."
              className="rounded-full border border-line px-4 py-1.5 text-sm transition hover:border-accent disabled:opacity-40"
            >
              Ask instead
            </button>
            <button
              type="button"
              onClick={() => void send("answer")}
              disabled={!canAnswer || sending || !draft.trim()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm text-paper transition hover:opacity-90 disabled:opacity-40"
            >
              {sending ? "Thinking…" : "Send answer"}
            </button>
          </div>
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
