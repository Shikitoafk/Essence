"use client";

import { useEffect, useMemo, useRef } from "react";
import { useIsomorphicLayoutEffect } from "@/lib/useIsomorphicLayoutEffect";
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
  minimumWords: number;
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
  minimumWords,
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
      const clashes = found.some((r) => hit.start < r.end && r.start < hit.end);
      if (!clashes) {
        found.push({ start: hit.start, end: hit.end, spotId: spot.id });
      }
    }
    return found.sort((a, b) => a.start - b.start);
  }, [value, spots]);

  /*
   * The paragraph the active spot sits in.
   *
   * The quote alone tells a student which line is flagged but not where the
   * material they surface belongs. Softly marking the surrounding paragraph
   * answers "where does this go" without proposing a single word of it.
   */
  const activeParagraph = useMemo(() => {
    const active = ranges.find((r) => r.spotId === activeSpotId);
    if (!active) return null;

    const before = value.lastIndexOf("\n\n", active.start);
    const after = value.indexOf("\n\n", active.end);
    return {
      start: before === -1 ? 0 : before + 2,
      end: after === -1 ? value.length : after,
    };
  }, [ranges, activeSpotId, value]);

  const segments = useMemo(() => {
    // Split on every boundary — quote edges and paragraph edges alike — so each
    // run carries a single, unambiguous pair of marks.
    const bounds = new Set<number>([0, value.length]);
    for (const range of ranges) {
      bounds.add(range.start);
      bounds.add(range.end);
    }
    if (activeParagraph) {
      bounds.add(activeParagraph.start);
      bounds.add(activeParagraph.end);
    }

    const points = [...bounds].sort((a, b) => a - b);
    const out: {
      text: string;
      spotId: string | null;
      inParagraph: boolean;
    }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (end <= start) continue;

      out.push({
        text: value.slice(start, end),
        spotId:
          ranges.find((r) => start >= r.start && end <= r.end)?.spotId ?? null,
        inParagraph: Boolean(
          activeParagraph &&
          start >= activeParagraph.start &&
          end <= activeParagraph.end,
        ),
      });
    }

    return out;
  }, [ranges, value, activeParagraph]);

  /*
   * Grow to fit rather than scroll inside a box.
   *
   * The draft used to be a fixed-height pane with its own scrollbar, and the
   * highlight layer had to be kept in step with it by hand. Letting the
   * textarea take the height of its content moves scrolling out to the page,
   * which deletes that whole class of bug — and, more to the point, is what
   * makes a margin possible: a note can only sit level with its line if the
   * line and the note scroll as one surface.
   */
  useIsomorphicLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [value]);

  /** Bring the highlighted line into view when a card is selected. */
  useEffect(() => {
    if (!activeSpotId) return;
    const mark = backdropRef.current?.querySelector<HTMLElement>(
      `[data-spot-id="${activeSpotId}"]`,
    );
    mark?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSpotId]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-line px-1 py-2 text-xs">
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

      {/* The textarea is in flow and sized to its content; the painted layer is
          stretched over it. Neither scrolls, so they cannot fall out of step. */}
      <div className="relative">
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="draft-shared-metrics pointer-events-none absolute inset-0 !px-0 text-transparent"
        >
          {segments.map((segment, i) => (
            <span
              key={i}
              className={[
                segment.spotId ? "quote-mark" : "",
                segment.inParagraph && !segment.spotId ? "paragraph-mark" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              {...(segment.spotId
                ? {
                    "data-spot-id": segment.spotId,
                    "data-active": segment.spotId === activeSpotId,
                  }
                : {})}
            >
              {segment.text}
            </span>
          ))}
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
          rows={1}
          placeholder={`Paste or write your draft here. Essence needs at least ${minimumWords} words before it will read it.`}
          className="draft-shared-metrics relative block w-full resize-none overflow-hidden !px-0 bg-transparent text-ink caret-accent outline-none"
        />
      </div>
    </div>
  );
}
