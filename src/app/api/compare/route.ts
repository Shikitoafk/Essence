import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COMPARE_SYSTEM } from "@/lib/ai/comparePrompt";
import { generate, parseJsonBody, userFacingError } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/parseReport";
import { isNearIdentical } from "@/lib/similarity";
import { checkRateLimit, recordUsage } from "@/lib/rateLimit";
import { selectCurrentSpots } from "@/lib/currentSpots";
import {
  COMPARISON_AXES,
  deriveMargin,
  deriveReadiness,
  MAX_TRANSFERABLE,
  MIN_DRAFT_WORDS,
  countWords,
  type AxisScore,
  type ComparisonAxis,
  type Essay,
  type FlaggedSpot,
  type TransferableElement,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ModelAxis {
  axis?: string;
  winner?: string;
  justification?: string;
}

interface ModelReply {
  winner?: string;
  verdict_summary?: string;
  axis_scores?: ModelAxis[];
  transferable_elements?: {
    quote?: string;
    destination_hint?: string;
    why?: string;
  }[];
}

/**
 * Head-to-head comparison. One call: both drafts and their stored diagnostics go
 * in together, and no fresh analysis of either version is run.
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

  const { versionAId, versionBId } = body;
  if (!versionAId || !versionBId || versionAId === versionBId) {
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

  const [spotsA, spotsB] = await Promise.all([
    loadCurrentSpots(supabase, versionA.id),
    loadCurrentSpots(supabase, versionB.id),
  ]);

  let parsed: ModelReply;
  try {
    const result = await generate({
      tier: "diagnostic",
      system: COMPARE_SYSTEM,
      prompt: buildComparePrompt(versionA, draftA, spotsA, versionB, draftB, spotsB),
      json: true,
      // Low: a verdict that flips between runs on the same pair is worthless.
      temperature: 0.3,
    });
    console.info(`[essence] comparison served by ${result.model}`);
    parsed = parseJsonBody<ModelReply>(result.text);
  } catch (error) {
    const safe = userFacingError(error, "comparison");
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }

  await recordUsage(supabase, user.id, "feedback");

  const winnerSide = parsed.winner?.trim().toUpperCase() === "B" ? "B" : "A";
  const winner = winnerSide === "B" ? versionB : versionA;
  const loser = winnerSide === "B" ? versionA : versionB;
  const loserDraft = winnerSide === "B" ? draftA : draftB;

  const sideToId = (side: string | undefined) =>
    side?.trim().toUpperCase() === "B" ? versionB.id : versionA.id;

  /*
   * Every axis is filled in, in the fixed order. A missing axis defaults to the
   * overall winner rather than being dropped: an axis table with holes in it
   * reads as a tie, and a tie is the one output this feature exists to refuse.
   */
  const axisScores: AxisScore[] = COMPARISON_AXES.map((axis) => {
    const row = (parsed.axis_scores ?? []).find(
      (a) => a.axis?.trim().toLowerCase() === axis,
    );
    return {
      axis: axis as ComparisonAxis,
      winner_id: row ? sideToId(row.winner) : winner.id,
      justification: (row?.justification ?? "").trim(),
    };
  });

  /*
   * Quotes must be verbatim from the LOSING draft — that is the whole guarantee
   * that nothing here was written for the student. Anything that can't be found
   * in their own losing text is dropped rather than shown.
   */
  const transferable: TransferableElement[] = (parsed.transferable_elements ?? [])
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
      version_a_id: versionA.id,
      version_b_id: versionB.id,
      winner_id: winner.id,
      margin,
      verdict_summary: (parsed.verdict_summary ?? "").trim(),
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

async function loadCurrentSpots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  essayId: string,
): Promise<FlaggedSpot[]> {
  const { data } = await supabase
    .from("flagged_spots")
    .select("*")
    .eq("essay_id", essayId);
  return selectCurrentSpots((data ?? []) as FlaggedSpot[]);
}

function describeVersion(
  label: "A" | "B",
  essay: Essay,
  draft: string,
  spots: FlaggedSpot[],
): string {
  const live = spots.filter(
    (s) => s.status === "open" || s.status === "answered",
  );

  const diagnostics =
    spots.length === 0
      ? "This version has not been read yet, so there are no stored findings."
      : live.length === 0
        ? "Every finding on this version has been worked through."
        : live
            .map(
              (s) =>
                `- [${s.impact}] ${s.pattern_name} — "${s.quoted_text}" · still unexplored: ${s.what_is_unexplored}`,
            )
            .join("\n");

  return `--- VERSION ${label}: ${essay.title} ---
Readiness: ${deriveReadiness(spots)}
Feedback rounds so far: ${essay.revision_count ?? 0}
Open findings from earlier reads:
${diagnostics}

Draft ${label}:
${draft}
--- END VERSION ${label} ---`;
}

function buildComparePrompt(
  versionA: Essay,
  draftA: string,
  spotsA: FlaggedSpot[],
  versionB: Essay,
  draftB: string,
  spotsB: FlaggedSpot[],
): string {
  const parts: string[] = [];

  if (versionA.prompt_text || versionB.prompt_text) {
    parts.push(
      `The prompt being answered:\n${versionA.prompt_text || versionB.prompt_text}`,
    );
  }

  const limit = versionA.word_limit ?? versionB.word_limit;
  if (limit) {
    parts.push(
      `Word limit: ${limit}. Version A is ${countWords(draftA)} words, version B is ${countWords(draftB)}.`,
    );
  }

  parts.push(describeVersion("A", versionA, draftA, spotsA));
  parts.push(describeVersion("B", versionB, draftB, spotsB));
  parts.push(
    "Decide which version this student should submit. Reply using the output contract exactly. Remember: you must pick one, and every quote you carry over must come verbatim from the losing draft.",
  );

  return parts.join("\n\n");
}
