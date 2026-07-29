export const NUDGE_PATTERNS = [
  "Underdeveloped change",
  "Strong detail, no aftermath",
  "Procedural narration",
  "Reflection gap",
  "Generic closing claim",
] as const;

export type NudgePattern = (typeof NUDGE_PATTERNS)[number];

export type Confidence = "high" | "medium" | "low";
export type SpotStatus = "open" | "resolved" | "skipped";
export type EssayKind = "personal_statement" | "supplemental";
export type MessageRole = "assistant" | "user";

/** Minimum draft length before we're willing to spend a Gemini call on it. */
export const MIN_DRAFT_WORDS = 50;

export interface Essay {
  id: string;
  user_id: string;
  title: string;
  prompt_text: string | null;
  word_limit: number | null;
  current_draft: string;
  essay_kind: EssayKind;
  school: string | null;
  last_feedback_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EssayVersion {
  id: string;
  essay_id: string;
  draft_text: string;
  word_count: number;
  label: string | null;
  created_at: string;
}

export interface FlaggedSpot {
  id: string;
  essay_id: string;
  version_id: string | null;
  pattern_name: string;
  confidence: Confidence;
  quoted_text: string;
  what_is_clear: string;
  what_is_unexplored: string;
  why_it_matters: string;
  question: string;
  queue_position: number;
  status: SpotStatus;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  essay_id: string;
  flagged_spot_id: string | null;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface EssayReport {
  id: string;
  essay_id: string;
  version_id: string | null;
  overall_impression: string;
  checklist_findings: string;
  framework_findings: string;
  priorities: string;
  strengths: string;
  created_at: string;
}

export interface EssayFact {
  id: string;
  essay_id: string;
  user_id: string;
  fact: string;
  is_sensitive: boolean;
  created_at: string;
}

/** A spot card as parsed out of the model's Mode A report, before it gets an id. */
export interface ParsedSpot {
  pattern_name: string;
  confidence: Confidence;
  quoted_text: string;
  what_is_clear: string;
  what_is_unexplored: string;
  why_it_matters: string;
  question: string;
}

export interface ParsedReport {
  overall_impression: string;
  checklist_findings: string;
  framework_findings: string;
  priorities: string;
  strengths: string;
  spots: ParsedSpot[];
  /** Indices into `spots`, most structurally important first. */
  queue: number[];
}

/**
 * Identity of a flagged spot across feedback runs: same pattern on the same
 * line is the same finding, even if the model rephrased its explanation or
 * shifted confidence. Used to carry a resolved/skipped status forward so a
 * student is never re-asked about something they already worked through.
 */
export function spotKey(patternName: string, quotedText: string): string {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  return `${normalise(patternName)}::${normalise(quotedText)}`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
