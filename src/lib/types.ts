export const NUDGE_PATTERNS = [
  "Underdeveloped change",
  "Strong detail, no aftermath",
  "Procedural narration",
  "Reflection gap",
  "Generic closing claim",
] as const;

export type NudgePattern = (typeof NUDGE_PATTERNS)[number];

export type Confidence = "high" | "medium" | "low";

/**
 * How much a finding actually matters. Without this every card looks equally
 * urgent, so a draft carrying only taste-level notes reads as broken and the
 * student keeps editing past the point of improvement.
 */
export const IMPACTS = ["structural", "substantive", "polish"] as const;
export type Impact = (typeof IMPACTS)[number];

export const IMPACT_LABEL: Record<Impact, string> = {
  structural: "Structural",
  substantive: "Substantive",
  polish: "Polish",
};

export const IMPACT_BLURB: Record<Impact, string> = {
  structural: "Affects whether the essay works at all.",
  substantive: "Changes what a reader takes away.",
  polish: "Taste. Safe to leave alone.",
};

/**
 * How finished the draft is. This gives the process an endpoint: without it a
 * tool that hunts for weaknesses finds them forever and the student circles.
 */
export const READINESS_STAGES = [
  "needs_work",
  "strong",
  "ready_to_submit",
] as const;

export type Readiness = (typeof READINESS_STAGES)[number];

/**
 * Derived from the open spots rather than self-reported by the model.
 *
 * A verdict the model announces separately can drift from the cards it just
 * wrote — claiming a draft is ready while listing structural problems, or the
 * reverse. Deriving it makes the verdict and the cards the same statement.
 */
export function deriveReadiness(
  spots: Pick<FlaggedSpot, "status" | "impact">[],
): Readiness {
  const open = spots.filter((s) => s.status === "open" || s.status === "answered");
  if (open.some((s) => s.impact === "structural")) return "needs_work";
  if (open.some((s) => s.impact === "substantive")) return "strong";
  return "ready_to_submit";
}

/** True once further reading is likelier to flatten the essay than improve it. */
export function isReadyToSubmit(readiness: Readiness | null): boolean {
  return readiness === "ready_to_submit";
}

/**
 * Past this many rounds, essays usually stop improving and start losing voice.
 * Runs are never blocked — the cost is just made visible.
 */
export const DIMINISHING_RETURNS_ROUND = 4;

/** From this round on, taste-level notes are collapsed out of the way. */
export const SUPPRESS_POLISH_FROM_ROUND = 3;
/**
 * `answered` is the stage that keeps the loop honest: the student has produced
 * real material in conversation, but it hasn't reached the draft. Only an
 * actual revision earns `resolved` — otherwise the tool congratulates people
 * for talking about their essay instead of writing it.
 */
export type SpotStatus = "open" | "answered" | "resolved" | "skipped";
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
  revision_count: number;
  archived_at: string | null;
  archived_reason: string | null;
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
  impact: Impact;
  quoted_text: string;
  what_is_clear: string;
  what_is_unexplored: string;
  why_it_matters: string;
  question: string;
  queue_position: number;
  status: SpotStatus;
  /** Specifics from the student's own answer that weren't yet in the draft. */
  new_material: string[];
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

/**
 * A passage the read judged effective and advises leaving alone.
 *
 * A list of pure criticism gives a student no way to tell which lines are
 * load-bearing, so they edit away the ones already doing the work.
 */
export interface WorkingWell {
  quote: string;
  why: string;
}

/** More than three would dilute the actionable spots — the opposite of the point. */
export const MAX_WORKING_WELL = 3;

export interface EssayReport {
  id: string;
  essay_id: string;
  version_id: string | null;
  overall_impression: string;
  checklist_findings: string;
  framework_findings: string;
  priorities: string;
  strengths: string;
  readiness: Readiness | null;
  readiness_why: string;
  readiness_next: string;
  working_well: WorkingWell[];
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
  impact: Impact;
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
  /** Readiness itself is derived from the spots' impacts, not parsed. */
  readiness_why: string;
  readiness_next: string;
  working_well: WorkingWell[];
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

/**
 * The five axes a head-to-head comparison scores. Fixed deliberately: these are
 * what change an admissions reader's decision, and letting the model invent its
 * own axes turns a verdict back into a balanced overview.
 */
export const COMPARISON_AXES = [
  "core_self",
  "texture",
  "voice",
  "structural_soundness",
  "risk",
] as const;

export type ComparisonAxis = (typeof COMPARISON_AXES)[number];

export const AXIS_LABEL: Record<ComparisonAxis, string> = {
  core_self: "Core self",
  texture: "Texture",
  voice: "Voice",
  structural_soundness: "Structural soundness",
  risk: "Risk",
};

export const AXIS_BLURB: Record<ComparisonAxis, string> = {
  core_self: "How specific and non-generic the person inside the story is.",
  texture: "Concrete lived detail against declared feeling.",
  voice: "Whether one identifiable person wrote this.",
  structural_soundness: "Whether the arc holds without its device.",
  risk: "What could cost the writer with a tired reader.",
};

/** Core self, voice and risk decide; the other two only break ties. */
export const DOMINANT_AXES: ComparisonAxis[] = ["core_self", "voice", "risk"];

export type Margin = "clear" | "narrow";

export interface AxisScore {
  axis: ComparisonAxis;
  winner_id: string;
  justification: string;
}

export interface TransferableElement {
  quote: string;
  from_version_id: string;
  destination_hint: string;
  why: string;
}

/** Never more than three: a hybrid of two coherent essays is coherent in neither. */
export const MAX_TRANSFERABLE = 3;

export interface EssayComparison {
  id: string;
  user_id: string;
  version_a_id: string;
  version_b_id: string;
  winner_id: string;
  margin: Margin;
  verdict_summary: string;
  axis_scores: AxisScore[];
  transferable_elements: TransferableElement[];
  accepted_at: string | null;
  created_at: string;
}

/**
 * `clear` only when the winner takes all three dominant axes. Derived here
 * rather than taken from the model, so the margin always matches the axis rows
 * the student can see for themselves.
 */
export function deriveMargin(
  axisScores: AxisScore[],
  winnerId: string,
): Margin {
  const dominant = DOMINANT_AXES.every((axis) =>
    axisScores.some((s) => s.axis === axis && s.winner_id === winnerId),
  );
  return dominant ? "clear" : "narrow";
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
