import { locateQuote } from "./locateQuote";
import type { ParsedSpot } from "../types";
import { normaliseReportMarkers } from "./reportMarkers";

/** Evidence-backed reading, independent of the number of correction cards. */
export interface ReaderAssessment {
  person: string;
  idea: string;
  idea_quote: string;
  idea_effect: string;
  voice: string;
  voice_quote: string;
  voice_effect: string;
  priority_action: "keep" | "revise";
  priority: string;
  priority_quote: string;
}

const KEYS = [
  "person", "idea", "idea_quote", "idea_effect", "voice", "voice_quote",
  "voice_effect", "priority_action", "priority", "priority_quote",
] as const;

export function parseReaderAssessment(section: string): ReaderAssessment | null {
  section = normaliseReportMarkers(section);
  const block = /<<<READING>>>([\s\S]*?)<<<ENDREADING>>>/.exec(section)?.[1];
  if (!block) return null;
  const fields: Record<string, string> = {};
  let current: string | null = null;
  for (const line of block.split(/\r?\n/)) {
    const field = /^\s*([a-z_]+)\s*:\s*(.*)$/i.exec(line);
    if (field && KEYS.includes(field[1].toLowerCase() as typeof KEYS[number])) {
      current = field[1].toLowerCase();
      fields[current] = field[2].trim();
    } else if (current && line.trim()) {
      fields[current] += ` ${line.trim()}`;
    }
  }
  if (KEYS.some((key) => key !== "priority_quote" && !fields[key])) return null;
  const action = fields.priority_action?.toLowerCase();
  if (action !== "keep" && action !== "revise") return null;
  if (action === "revise" && !fields.priority_quote) return null;
  return { ...fields, priority_action: action, priority_quote: fields.priority_quote ?? "" } as unknown as ReaderAssessment;
}

/** Quote presence validates grounding, not literary taste or admission likelihood. */
export function anchorReaderAssessment(
  reading: ReaderAssessment | null,
  draft: string,
  spots: ParsedSpot[],
): ReaderAssessment | null {
  if (!reading) return null;
  const idea = locateQuote(draft, reading.idea_quote);
  const voice = locateQuote(draft, reading.voice_quote);
  if (!idea || !voice) return null;
  if (reading.priority_action === "keep" && spots.some((spot) =>
    spot.impact !== "polish" && locateQuote(draft, spot.quoted_text) !== null)) return null;
  const priority = reading.priority_action === "revise"
    ? locateQuote(draft, reading.priority_quote)
    : null;
  if (reading.priority_action === "revise") {
    if (!priority) return null;
    // An essay-level weakness must reach an actionable card, not disappear
    // into prose while an empty card list declares the essay finished.
    const card = spots.some((spot) => {
      const quote = locateQuote(draft, spot.quoted_text);
      return spot.impact !== "polish" && quote !== null &&
        priority.start < quote.end && quote.start < priority.end;
    });
    if (!card) return null;
  }
  return {
    ...reading, idea_quote: idea.text, voice_quote: voice.text,
    priority_quote: priority?.text ?? "",
  };
}

export function formatReaderAssessment(reading: ReaderAssessment): string {
  const quote = (text: string) => text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
  return [
    "### Person on the page", reading.person,
    "### Idea", reading.idea, quote(reading.idea_quote), reading.idea_effect,
    "### Voice", reading.voice, quote(reading.voice_quote), reading.voice_effect,
    "### Revision priority", reading.priority,
    ...(reading.priority_quote ? [quote(reading.priority_quote)] : []),
  ].join("\n\n");
}

/** Old saved reads may be displayed, but must not block a first complete read. */
export function hasReaderAssessment(text: string): boolean {
  return ["Person on the page", "Idea", "Voice", "Revision priority"]
    .every((heading) => text.includes(`### ${heading}\n`));
}

export function canReuseReaderAssessment(
  draft: string, feedbackDraft: string | null, assessmentText: string,
): boolean {
  return feedbackDraft !== null && feedbackDraft.trim() === draft.trim() &&
    hasReaderAssessment(assessmentText);
}
