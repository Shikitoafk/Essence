import { COMPARISON_AXES, type ComparisonAxis } from "@/lib/types";

export type ComparisonSide = "A" | "B";

export interface ModelAxisReply {
  axis?: string;
  winner?: string;
  justification?: string;
}

export interface ModelComparisonReply {
  winner?: string;
  verdict_summary?: string;
  axis_scores?: ModelAxisReply[];
  transferable_elements?: {
    quote?: string;
    destination_hint?: string;
    why?: string;
  }[];
}

export interface ValidatedComparisonReply {
  winner: ComparisonSide;
  axes: Map<ComparisonAxis, ModelAxisReply & { winner: ComparisonSide }>;
  verdict_summary: string;
  transferable_elements: { quote: string; destination_hint: string; why: string }[];
}

function side(value: unknown): ComparisonSide | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized === "A" || normalized === "B" ? normalized : null;
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
/**
 * A malformed model response must never become a vote for whichever draft was
 * placed in slot A. Comparison is consequential, so an incomplete decision is
 * rejected instead of repaired with invented defaults.
 */
export function validateComparisonReply(
  reply: unknown,
): ValidatedComparisonReply | null {
  if (!object(reply)) return null;
  const winner = side(reply.winner);
  if (!winner || !nonempty(reply.verdict_summary)) return null;
  if (!Array.isArray(reply.axis_scores) || reply.axis_scores.length !== COMPARISON_AXES.length) return null;
  if (!reply.axis_scores.every(object)) return null;

  const axes = new Map<
    ComparisonAxis,
    ModelAxisReply & { winner: ComparisonSide }
  >();

  for (const axis of COMPARISON_AXES) {
    const matching = reply.axis_scores.filter(
      (row) => typeof row.axis === "string" && row.axis.trim().toLowerCase() === axis,
    );
    if (matching.length !== 1) return null;

    const axisWinner = side(matching[0].winner);
    if (!axisWinner || !nonempty(matching[0].justification)) return null;
    axes.set(axis, { axis, justification: matching[0].justification.trim(), winner: axisWinner });
  }

  const transferable_elements: ValidatedComparisonReply["transferable_elements"] = [];
  if (reply.transferable_elements !== undefined) {
    if (!Array.isArray(reply.transferable_elements)) return null;
    for (const item of reply.transferable_elements) {
      if (!object(item) || !nonempty(item.quote) || !nonempty(item.destination_hint) || !nonempty(item.why)) return null;
      transferable_elements.push({ quote: item.quote.trim(), destination_hint: item.destination_hint.trim(), why: item.why.trim() });
    }
  }
  return { winner, axes, verdict_summary: reply.verdict_summary.trim(), transferable_elements };
}
