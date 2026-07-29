"use client";

import { useEffect, useMemo, useRef } from "react";
import { locateQuote } from "@/lib/ai/parseReport";
import { countWords, type FlaggedSpot } from "@/lib/types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  spots: FlaggedSpot[];
  activeSpotId: string | null;
  onSelectSpot: (spotId: string) => void;
  wordLimit: number | null;
  saving: "idle" | "saving" | "saved" | "error";
}

interface Range {
  start: number;
  end: number;
  spotId: string;
}

/**
 * A plain textarea with a highlight layer painted underneath it. The overlay
 * and the textarea share `.draft-shared-metrics` so glyphs land in exactly the
 * same place; if you change typography, change it there, once.
 */
export default function DraftEditor({
  value,
  onChange,
  spots,
  activeSpotId,
  onSelectSpot,
  wordLimit,
  saving,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const words = countWords(value);
  const over = wordLimit != null && words > wordLimit;

  const ranges = useMemo<Range[]>(() => {
    const found: Range[] = [];
    for (const spot of spots) {
      if (spot.status !== "open") continue;
      const hit = locateQuote(value, spot.quoted_text);
      if (!hit) continue;
      // Overlapping highlights would nest badly — first spot to claim a span wins.
      const clashes = found.some(
        (r) => hit.start < r.end && r.start < hit.end,
      );
      if (!clashes) {
        found.push({ start: hit.start, end: hit.end, spotId: spot.id });
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }, [value, spots]);

  const segments = useMemo(() => {
    const out: { text: string; spotId: string | null }[] = [];
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        out.push({ text: value.slice(cursor, range.start), spotId: null });
      }
      out.push({
        text: value.slice(range.start, range.end),
        spotId: range.spotId,
      });
      cursor = range.end;
    }
    out.push({ text: value.slice(cursor), spotId: null });
    return out;
  }, [ranges, value]);

  // Keep the painted layer locked to the textarea's scroll position.
  useEffect(() => {
    const ta = textareaRef.current;
    const backdrop = backdropRef.current;
    if (!ta || !backdrop) return;
    const sync = () => {
      backdrop.scrollTop = ta.scrollTop;
      backdrop.scrollLeft = ta.scrollLeft;
    };
    sync();
    ta.addEventListener("scroll", sync);
    return () => ta.removeEventListener("scroll", sync);
  }, [value]);

  /** Scroll the highlighted line into view when a card is selected. */
  useEffect(() => {
    if (!activeSpotId) return;
    const backdrop = backdropRef.current;
    const ta = textareaRef.current;
    if (!backdrop || !ta) return;
    const mark = backdrop.querySelector<HTMLElement>(
      `[data-spot-id="${activeSpotId}"]`,
    );
    if (!mark) return;
    const target = Math.max(
      0,
      mark.offsetTop - ta.clientHeight / 2 + mark.offsetHeight / 2,
    );
    ta.scrollTo({ top: target, behavior: "smooth" });
  }, [activeSpotId]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span className={over ? "font-medium text-flag-high" : "text-muted"}>
            {words} word{words === 1 ? "" : "s"}
            {wordLimit ? ` / ${wordLimit}` : ""}
          </span>
          {over && (
            <span className="rounded-full bg-flag-high/10 px-2 py-0.5 text-flag-high">
              {words - wordLimit!} over
            </span>
          )}
          {ranges.length > 0 && (
            <span className="text-muted">
              {ranges.length} spot{ranges.length === 1 ? "" : "s"} marked
            </span>
          )}
        </div>
        <span className="text-muted">
          {saving === "saving" && "Saving…"}
          {saving === "saved" && "Saved"}
          {saving === "error" && (
            <span className="text-flag-high">Not saved</span>
          )}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="draft-shared-metrics pointer-events-none absolute inset-0 overflow-hidden text-transparent"
        >
          {segments.map((segment, i) =>
            segment.spotId ? (
              <span
                key={i}
                className="quote-mark"
                data-spot-id={segment.spotId}
                data-active={segment.spotId === activeSpotId}
              >
                {segment.text}
              </span>
            ) : (
              <span key={i}>{segment.text}</span>
            ),
          )}
          {/* Trailing newline keeps the last line's height in sync. */}
          {"\n"}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            // Clicking inside a highlighted span selects that card.
            const pos = e.currentTarget.selectionStart;
            const hit = ranges.find((r) => pos >= r.start && pos <= r.end);
            if (hit) onSelectSpot(hit.spotId);
          }}
          spellCheck
          placeholder="Paste or write your draft here. Essence needs at least 50 words before it will read it."
          className="draft-shared-metrics absolute inset-0 h-full w-full resize-none bg-transparent text-ink caret-accent outline-none"
        />
      </div>
    </div>
  );
}
