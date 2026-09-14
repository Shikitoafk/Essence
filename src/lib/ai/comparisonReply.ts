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
}

function side(value: string | undefined): ComparisonSide | null {
  const normalized = value?.trim().toUpperCase();
  return normalized === "A" || normalized === "B" ? normalized : null;
}

/**
 * A malformed model response must never become a vote for whichever draft was
 * placed in slot A. Comparison is consequential, so an incomplete decision is
 * rejected instead of repaired with invented defaults.
 */
export function validateComparisonReply(
  reply: ModelComparisonReply,
): ValidatedComparisonReply | null {
  const winner = side(reply.winner);
  if (!winner) return null;

  const axes = new Map<
    ComparisonAxis,
    ModelAxisReply & { winner: ComparisonSide }
  >();

  for (const axis of COMPARISON_AXES) {
    const matching = (reply.axis_scores ?? []).filter(
      (row) => row.axis?.trim().toLowerCase() === axis,
    );
    if (matching.length !== 1) return null;

    const axisWinner = side(matching[0].winner);
    if (!axisWinner || !matching[0].justification?.trim()) return null;
    axes.set(axis, { ...matching[0], winner: axisWinner });
  }

  return { winner, axes };
}
