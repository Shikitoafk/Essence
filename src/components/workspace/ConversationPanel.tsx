"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * The Socratic loop. Exactly one question is live at a time — the current spot
 * is whichever open spot sits earliest in the queue, and the input is bound to
 * that spot until the engine says it's resolved or set aside.
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const openSpots = spots
    .filter((s) => s.status === "open")
    .sort((a, b) => a.queue_position - b.queue_position);
  const currentSpot = openSpots[0] ?? null;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  async function send() {
    const text = draft.trim();
    if (!text || !currentSpot || sending) return;

    setSending(true);
    setError(null);

    const optimistic: ConversationMessage = {
      id: `pending-${Date.now()}`,
      essay_id: essayId,
      flagged_spot_id: currentSpot.id,
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
        body: JSON.stringify({
          essayId,
          spotId: currentSpot.id,
          message: text,
        }),
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
          flagged_spot_id: currentSpot.id,
          role: "assistant",
          content: payload.reply,
          created_at: new Date().toISOString(),
        },
      ];

      if (payload.verdict !== "needs_narrower") {
        onSpotResolved(currentSpot.id, payload.verdict);
        if (payload.nextSpot) {
          next.push({
            id: `assistant-next-${Date.now()}`,
            essay_id: essayId,
            flagged_spot_id: payload.nextSpot.id,
            role: "assistant",
            content: payload.nextSpot.question,
            created_at: new Date().toISOString(),
          });
          onSelectSpot(payload.nextSpot.id);
        }
      }

      onMessagesChange(next);
    } catch {
      setError("Couldn't reach the server. Your message is saved — try again.");
    } finally {
      setSending(false);
    }
  }

  const spotLabel = (spotId: string | null) => {
    if (!spotId) return null;
    return spots.find((s) => s.id === spotId)?.pattern_name ?? null;
  };

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="font-serif text-base">Follow-up</h2>
          <p className="text-xs text-muted">
            {currentSpot
              ? `One question at a time · ${openSpots.length} left`
              : spots.length > 0
                ? "Every spot has been worked through."
                : "Run a read first."}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            When Essence reads your draft, the first question lands here.
            Answers you give become raw material for you to write with — nothing
            here gets pasted into your essay for you.
          </p>
        )}

        {messages.map((message) => {
          const label = spotLabel(message.flagged_spot_id);
          const mine = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${mine ? "text-right" : ""}`}>
                {!mine && label && (
                  <button
                    type="button"
                    onClick={() =>
                      message.flagged_spot_id &&
                      onSelectSpot(message.flagged_spot_id)
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
        })}

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
