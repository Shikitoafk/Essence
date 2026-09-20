import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  COMPARE_SYSTEM,
  buildComparePrompt,
  comparisonContextConflict,
} from "@/lib/ai/comparePrompt";
import { generate, parseJsonBody, userFacingError } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/parseReport";
import { validateComparisonReply } from "@/lib/ai/comparisonReply";
import { isNearIdentical } from "@/lib/similarity";
import { checkRateLimit, recordUsage } from "@/lib/rateLimit";
import {
  COMPARISON_AXES,
  deriveMargin,
  MAX_TRANSFERABLE,
  MIN_DRAFT_WORDS,
  countWords,
  type AxisScore,
  type ComparisonAxis,
  type Essay,
  type TransferableElement,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Head-to-head comparison of anonymous drafts, without prior diagnostic labels.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { versionAId?: string; versionBId?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { versionAId, versionBId } = body ?? {};
  if (typeof versionAId !== "string" || typeof versionBId !== "string" || !versionAId || !versionBId || versionAId === versionBId) {
    return NextResponse.json(
      { error: "Pick two different essays to compare." },
      { status: 400 },
    );
  }

  // RLS already scopes these to the signed-in user, so fetching both is also
  // the ownership check the comparison needs.
  const { data: essayRows } = await supabase
    .from("essays")
    .select("*")
    .in("id", [versionAId, versionBId]);

  const essays = (essayRows ?? []) as Essay[];
  const versionA = essays.find((e) => e.id === versionAId);
  const versionB = essays.find((e) => e.id === versionBId);

  if (!versionA || !versionB) {
    return NextResponse.json(
      { error: "One of those essays isn't available." },
      { status: 404 },
    );
  }

  const draftA = (versionA.current_draft ?? "").trim();
  const draftB = (versionB.current_draft ?? "").trim();
  const conflict = comparisonContextConflict(versionA, versionB);
  if (conflict) {
    return NextResponse.json({ error: conflict, code: "different_assignments" }, { status: 400 });
  }

  if (
    countWords(draftA) < MIN_DRAFT_WORDS ||
    countWords(draftB) < MIN_DRAFT_WORDS
  ) {
    return NextResponse.json(
      {
        error: `Both versions need at least ${MIN_DRAFT_WORDS} words before they can be compared.`,
        code: "too_short",
      },
      { status: 400 },
    );
  }

  // Two drafts a few edits apart have nothing to choose between, and asking for
  // a winner would invent a distinction. Caught before spending the call.
  if (isNearIdentical(draftA, draftB)) {
    return NextResponse.json(
      {
        error:
          "These are the same essay with minor edits, so there's no real choice to make here. Use the version history on either one to see what changed.",
        code: "near_identical",
      },
      { status: 400 },
    );
  }

  const limit = await checkRateLimit(supabase, user.id, "feedback");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.message, code: "rate_limited" },
      {
        status: 429,
        headers: limit.retryAfterSeconds
          ? { "Retry-After": String(limit.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  /*
   * Which draft the model is shown as "A" is decided by version id, not by the
   * order the student clicked in. The picker lists essays newest first, so the
   * newer draft was landing in slot A on nearly every comparison, and a model
   * that leans toward the first option it reads leans toward the newer draft
   * for a reason that has nothing to do with the writing. Store this same order
   * so references to A and B in the model's prose remain attached to their text.
   */
  const flip = versionA.id > versionB.id;
  const shownA = flip ? versionB : versionA;
  const shownB = flip ? versionA : versionB;
  const shownDraftA = flip ? draftB : draftA;
  const shownDraftB = flip ? draftA : draftB;

  let parsed: unknown;
  try {
    const result = await generate({
      tier: "comparison",
      system: COMPARE_SYSTEM,
      prompt: buildComparePrompt(
        shownA,
        shownDraftA,
        shownB,
        shownDraftB,
      ),
      json: true,
      // Low: a verdict that flips between runs on the same pair is worthless.
      temperature: 0.3,
    });
    console.info(`[essence] comparison served by ${result.model}`);
    parsed = parseJsonBody<unknown>(result.text);
  } catch (error) {
    const safe = userFacingError(error, "comparison");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }

  await recordUsage(supabase, user.id, "feedback");

  const decision = validateComparisonReply(parsed);
  if (!decision) {
    return NextResponse.json(
      {
        error:
          "The model did not produce a complete comparison, so Essence refused to guess. Try the comparison again.",
        code: "invalid_comparison",
      },
      { status: 502 },
    );
  }

  const winnerSide = decision.winner;
  const winner = winnerSide === "B" ? shownB : shownA;
  const loser = winnerSide === "B" ? shownA : shownB;
  const loserDraft = winnerSide === "B" ? shownDraftA : shownDraftB;

  const sideToId = (side: "A" | "B") =>
    side === "B" ? shownB.id : shownA.id;

  const axisScores: AxisScore[] = COMPARISON_AXES.map((axis) => {
    const row = decision.axes.get(axis)!;
    return {
      axis: axis as ComparisonAxis,
      winner_id: sideToId(row.winner),
      justification: row.justification!.trim(),
    };
  });

  /*
   * Quotes must be verbatim from the LOSING draft — that is the whole guarantee
   * that nothing here was written for the student. Anything that can't be found
   * in their own losing text is dropped rather than shown.
   */
  const transferable: TransferableElement[] = decision.transferable_elements
    .map((item) => {
      const located = locateQuote(loserDraft, (item.quote ?? "").trim());
      if (!located) return null;
      return {
        quote: located.text,
        from_version_id: loser.id,
        destination_hint: (item.destination_hint ?? "").trim(),
        why: (item.why ?? "").trim(),
      };
    })
    .filter((item): item is TransferableElement => item !== null)
    .slice(0, MAX_TRANSFERABLE);

  const margin = deriveMargin(axisScores, winner.id);

  const { data: saved, error } = await supabase
    .from("essay_comparisons")
    .insert({
      user_id: user.id,
      version_a_id: shownA.id,
      version_b_id: shownB.id,
      winner_id: winner.id,
      margin,
      verdict_summary: decision.verdict_summary,
      axis_scores: axisScores,
      transferable_elements: transferable,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !saved) {
    return NextResponse.json(
      { error: "The comparison ran but couldn't be saved. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, comparisonId: saved.id });
}
