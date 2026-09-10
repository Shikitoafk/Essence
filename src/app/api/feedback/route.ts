import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODE_A_SYSTEM } from "@/lib/ai/systemPrompt";
import { generate, userFacingError } from "@/lib/ai/llm";
import {
  locateQuote,
  parseModeAReport,
  parseSpotCards,
} from "@/lib/ai/parseReport";
import {
  findProseOnlyDiagnoses,
  findUncardedCandidates,
} from "@/lib/ai/coverageGaps";
import {
  buildModeAPrompt,
  buildRecoveryPrompt,
  type SeasonContext,
} from "@/lib/ai/modeAPrompt";
import { checkRateLimit, recordUsage } from "@/lib/rateLimit";
import { selectCurrentSpots } from "@/lib/currentSpots";
import {
  countWords,
  deriveReadiness,
  spotKey,
  minimumWordsForEssay,
  SUPPRESS_POLISH_FROM_ROUND,
  type Essay,
  type FlaggedSpot,
  type SpotStatus,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Mode A — the once-per-draft deep diagnostic. One Gemini call for the whole
 * essay, per the batching requirement; everything after this runs on the
 * cheaper conversation tier.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { essayId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const essayId = body.essayId;
  if (!essayId) {
    return NextResponse.json({ error: "Missing essayId." }, { status: 400 });
  }

  const { data: essay } = await supabase
    .from("essays")
    .select("*")
    .eq("id", essayId)
    .single<Essay>();

  if (!essay) {
    return NextResponse.json({ error: "Essay not found." }, { status: 404 });
  }

  const draft = (essay.current_draft ?? "").trim();
  const words = countWords(draft);
  const minimumWords = minimumWordsForEssay(essay.essay_kind);
  if (words < minimumWords) {
    return NextResponse.json(
      {
        error: `There's not much to read yet — ${words} word${words === 1 ? "" : "s"}. Write at least ${minimumWords} before asking for feedback.`,
        code: "too_short",
      },
      { status: 400 },
    );
  }

  const context = await buildSeasonContext(supabase, user.id, essay, draft);

  // A second model call is not a second opinion. If the text is unchanged, it
  // has to keep the same cards and verdict — especially a finished draft must
  // not be made "unfinished" by sampling noise. Reuse the saved read and do
  // not spend a request quota on it.
  if (context.draftUnchanged) {
    return NextResponse.json({
      ok: true,
      reused: true,
      spotCount: 0,
      droppedCount: 0,
      carriedOver: 0,
      truncated: false,
      draftUnchanged: true,
    });
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

  let raw: string;
  try {
    const result = await generate({
      tier: "diagnostic",
      system: MODE_A_SYSTEM,
      prompt: buildModeAPrompt(essay, draft, context),
      temperature: 0.6,
    });
    raw = result.text;
    // Which model answered is operator information, not student information.
    console.info(`[essence] feedback read served by ${result.model}`);
  } catch (error) {
    const safe = userFacingError(error, "feedback read");
    return NextResponse.json(
      { error: safe.message },
      {
        status: safe.status,
        headers: safe.retryAfterSeconds
          ? { "Retry-After": String(safe.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  await recordUsage(supabase, user.id, "feedback");

  const report = parseModeAReport(raw);

  /*
   * A truncated report is indistinguishable from a clean one that found
   * nothing: the early sections arrive, the cards and queue fall off the end,
   * the student is told their essay is fine. The contract ends with <<<END>>>,
   * so its absence means the model was cut off — say so instead of implying a
   * verdict the model never reached.
   */
  const truncated = !raw.includes("<<<END>>>");

  /*
   * Recover findings the read lost between its own scan and its cards.
   *
   * The contract is that a candidate either becomes a card or gets a DROPPED
   * line saying why. Models break it silently: one read raised nine
   * candidates, dropped none by hand, and emitted three cards. Six gaps it had
   * already found never reached the student, and nothing in the output said
   * so. Prompt wording has not fixed this across several attempts.
   *
   * So the gap is closed here instead. The second call is small and narrow —
   * it is handed the paragraphs in question and asked for cards and nothing
   * else, on the cheap tier, rather than reading the essay again.
   */
  const uncarded = findUncardedCandidates(
    draft,
    report.scan.candidates,
    report.scan.dropped,
    report.spots.map((spot) => spot.quoted_text),
  );

  if (uncarded.length > 0) {
    console.warn(
      `[essence] ${uncarded.length} candidate(s) on essay ${essay.id} were scanned, never dropped and never carded — recovering.`,
    );
    try {
      const recovery = await generate({
        tier: "conversation",
        system: MODE_A_SYSTEM,
        prompt: buildRecoveryPrompt(draft, uncarded),
        temperature: 0.4,
      });
      const recovered = parseSpotCards(recovery.text).filter((spot) =>
        locateQuote(draft, spot.quoted_text),
      );
      report.spots.push(...recovered);
      report.queue = report.spots.map((_, index) => index);
      console.info(
        `[essence] recovered ${recovered.length} of ${uncarded.length} lost finding(s).`,
      );
    } catch (error) {
      // A read with most of its cards beats no read at all: the student still
      // gets what came back the first time.
      console.warn(
        `[essence] recovery pass failed: ${(error as Error).message.slice(0, 120)}`,
      );
    }
  }

  // Snapshot the draft this report describes, so spots stay anchored to the
  // exact text they were found in even after the student edits.
  const { data: version } = await supabase
    .from("essay_versions")
    .insert({
      essay_id: essay.id,
      draft_text: draft,
      word_count: words,
      label: "Feedback run",
    })
    .select("id")
    .single<{ id: string }>();

  const versionId = version?.id ?? null;

  // Whatever the student already settled stays settled. Keyed by pattern+line
  // so a re-read doesn't re-ask a question they've answered or waved off.
  const { data: settled } = await supabase
    .from("flagged_spots")
    .select("pattern_name, quoted_text, status")
    .eq("essay_id", essay.id)
    .in("status", ["resolved", "skipped"]);

  const settledStatus = new Map<string, SpotStatus>();
  for (const prior of settled ?? []) {
    settledStatus.set(
      spotKey(prior.pattern_name as string, prior.quoted_text as string),
      prior.status as SpotStatus,
    );
  }

  // Re-anchor each quote against the real draft so the editor can highlight it,
  // and drop any card whose quote the model invented outright.
  const ordered = report.queue
    .map((index) => report.spots[index])
    .filter(Boolean);

  const seen = new Set<string>();
  const rows = ordered
    .map((spot) => {
      const located = locateQuote(draft, spot.quoted_text);
      if (!located) return null;

      // A single run occasionally emits the same finding twice — keep the first.
      const key = spotKey(spot.pattern_name, located.text);
      if (seen.has(key)) return null;
      seen.add(key);

      return {
        essay_id: essay.id,
        version_id: versionId,
        pattern_name: spot.pattern_name,
        confidence: spot.confidence,
        impact: spot.impact,
        quoted_text: located.text,
        what_is_clear: spot.what_is_clear,
        what_is_unexplored: spot.what_is_unexplored,
        why_it_matters: spot.why_it_matters,
        question: spot.question,
        queue_position: 0,
        status: settledStatus.get(key) ?? ("open" as SpotStatus),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .map((row, position) => ({ ...row, queue_position: position }));

  if (rows.length > 0) {
    await supabase.from("flagged_spots").insert(rows);
  }

  /*
   * Card accounting. "Why did this read only find three things" has three
   * different answers — the model emitted three, or it emitted more and the
   * anchoring dropped them, or the round bar suppressed them before it counted
   * anything — and the student-facing number cannot tell them apart. Print all
   * of it so the next unexpected count is diagnosable without a re-run.
   */
  console.info(
    `[essence] read ${context.round} on essay ${essay.id}: scan saw ${report.scan.candidates.length} candidate(s) and dropped ${report.scan.dropped.length} of them by hand; model emitted ${report.spots.length} card(s), ${rows.length} kept, ${ordered.length - rows.length} dropped (quote not in draft, or duplicate)${
      context.round >= SUPPRESS_POLISH_FROM_ROUND
        ? "; polish-level findings were suppressed for this round"
        : ""
    }.`,
  );
  if (report.scan.dropped.length > 0) {
    console.info(
      `[essence] scan dropped: ${report.scan.dropped.map((d) => `"${d.slice(0, 90)}"`).join("; ")}`,
    );
  }

  /*
   * Confidence calibration. A field that always reads "high" carries no
   * information, so the distribution is logged: if reads keep coming back
   * unanimous, the scale isn't being used and the prompt needs tightening.
   */
  if (rows.length >= 3 && rows.every((r) => r.confidence === "high")) {
    console.warn(
      `[essence] all ${rows.length} findings on essay ${essay.id} came back "high" confidence — the scale may not be in use.`,
    );
  }

  /*
   * Stability check. On an unchanged draft the findings should be the same
   * findings — a structural spot that appears in one run and vanishes in the
   * next on identical input means the read is partly noise, and the diagnostic
   * temperature wants lowering. Logged rather than surfaced: it is a signal for
   * whoever runs the deployment, not something the student can act on.
   */
  if (context.draftUnchanged && context.previousSpotKeys.length > 0) {
    const nowKeys = rows.map((r) => spotKey(r.pattern_name, r.quoted_text));
    const appeared = rows.filter(
      (r) =>
        r.impact === "structural" &&
        !context.previousSpotKeys.includes(
          spotKey(r.pattern_name, r.quoted_text),
        ),
    );
    const vanished = context.previousSpotKeys.filter(
      (key) => !nowKeys.includes(key),
    );

    if (appeared.length > 0 || vanished.length > 0) {
      console.warn(
        `[essence] unstable read on unchanged draft ${essay.id}: ${appeared.length} new structural finding(s), ${vanished.length} finding(s) gone. Consider lowering the diagnostic temperature.`,
      );
    }
  }

  /*
   * Coverage check. Only a card gets highlighted in the editor and turned into
   * a follow-up question, so a passage the read criticises in prose and never
   * anchors is a criticism the student can read and cannot work on. The prompt
   * forbids it; this is what notices when the model does it anyway.
   *
   * Logged, not surfaced and not grounds for rejecting the read: the student
   * paid a request for this report, and throwing it away over a check that can
   * misread an approving quote would cost them more than the gap does. The
   * sections that praise the draft — strengths, and the passages to leave
   * alone — are kept out of it for the same reason.
   */
  const proseOnly = findProseOnlyDiagnoses(
    draft,
    [
      { section: "overall impression", text: report.overall_impression },
      { section: "checklist findings", text: report.checklist_findings },
      { section: "framework findings", text: report.framework_findings },
      { section: "readiness note", text: report.readiness_next },
    ],
    rows.map((row) => row.quoted_text),
  );

  if (proseOnly.length > 0) {
    console.warn(
      `[essence] ${proseOnly.length} passage(s) on essay ${essay.id} were diagnosed in prose with no card to work on: ${proseOnly
        .map((gap) => `${gap.section} — "${gap.quote.slice(0, 60)}"`)
        .join("; ")}`,
    );
  }

  // Written after the cards exist, because the verdict is derived from what was
  // actually flagged — the report and the cards are one statement, not two
  // opinions that can drift apart.
  const readiness = deriveReadiness(rows);

  await supabase.from("essay_reports").insert({
    essay_id: essay.id,
    version_id: versionId,
    overall_impression: report.overall_impression,
    checklist_findings: report.checklist_findings,
    framework_findings: report.framework_findings,
    coverage_note: report.coverage_note,
    strengths: report.strengths,
    readiness,
    readiness_why: report.readiness_why,
    readiness_next: report.readiness_next,
    /*
     * Same anchoring rule as the spot cards: a passage the student is told to
     * protect has to actually be in their draft.
     *
     * And it must not be a passage the same read flagged. Observed once in
     * thirty reads: "Our group fell apart after a disagreement" carried a card
     * saying the decision behind it is missing, and a keep card saying to
     * leave the line alone. Rare, and unusable when it happens — the student
     * is handed the same sentence as the thing to fix and the thing to
     * protect, and nothing tells them which to believe. The finding wins: it
     * is the one with a question attached.
     */
    working_well: report.working_well
      .map((item) => {
        const located = locateQuote(draft, item.quote);
        if (!located) return null;
        const clashes = rows.some((row) => {
          const flagged = locateQuote(draft, row.quoted_text);
          return (
            flagged !== null &&
            located.start < flagged.end &&
            flagged.start < located.end
          );
        });
        return clashes ? null : { quote: located.text, why: item.why };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  });

  /*
   * No question is posted here. The student asks for the first one from the
   * workspace when they're ready — a read can surface a lot at once, and being
   * handed a question before you've finished reading the diagnostic is exactly
   * the pressure this tool is supposed to avoid.
   */

  const carriedOver = rows.filter((row) => row.status !== "open").length;

  await supabase
    .from("essays")
    .update({
      last_feedback_at: new Date().toISOString(),
      revision_count: context.round,
    })
    .eq("id", essay.id);

  return NextResponse.json({
    ok: true,
    versionId,
    spotCount: rows.length,
    droppedCount: ordered.length - rows.length,
    carriedOver,
    truncated,
    draftUnchanged: context.draftUnchanged,
    proseOnlyCount: proseOnly.length,
  });
}


/**
 * Season memory, per the cross-essay rules: durable facts the student has
 * shared, what's already been resolved, and their other essays (so the model
 * can catch checklist point 11 — two essays revealing the same facet).
 * Anything the student marked sensitive is never loaded.
 */
async function buildSeasonContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  essay: Essay,
  draft: string,
): Promise<SeasonContext> {
  const [
    factsResult,
    essaysResult,
    resolvedResult,
    historyResult,
    lastVersionResult,
    priorSpotsResult,
  ] = await Promise.all([
    supabase
      .from("essay_facts")
      .select("fact")
      .eq("user_id", userId)
      .eq("is_sensitive", false)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("essays")
      .select("title, essay_kind")
      .eq("user_id", userId)
      .neq("id", essay.id)
      .limit(10),
    supabase
      .from("flagged_spots")
      .select("quoted_text, status")
      .eq("essay_id", essay.id)
      .in("status", ["resolved", "skipped"])
      .limit(30),
    supabase
      .from("essay_reports")
      .select("readiness", { count: "exact" })
      .eq("essay_id", essay.id)
      .order("created_at", { ascending: false })
      .limit(1),
    // Every read snapshots the draft it read, so the newest snapshot is what
    // the previous verdict was passed on.
    supabase
      .from("essay_versions")
      .select("draft_text")
      .eq("essay_id", essay.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ draft_text: string }>(),
    supabase.from("flagged_spots").select("*").eq("essay_id", essay.id),
  ]);

  const lastRead = lastVersionResult.data?.draft_text ?? null;

  return {
    facts: (factsResult.data ?? []).map((r) => r.fact as string),
    otherEssays: (essaysResult.data ?? []).map((r) => ({
      title: r.title as string,
      kind: r.essay_kind as string,
    })),
    previouslyResolved: (resolvedResult.data ?? [])
      .filter((r) => r.status === "resolved")
      .map((r) => r.quoted_text as string),
    setAside: (resolvedResult.data ?? [])
      .filter((r) => r.status === "skipped")
      .map((r) => r.quoted_text as string),
    round: (historyResult.count ?? 0) + 1,
    previousReadiness:
      (historyResult.data?.[0]?.readiness as string | null) ?? null,
    draftUnchanged: lastRead !== null && lastRead.trim() === draft.trim(),
    previousSpotKeys: selectCurrentSpots(
      (priorSpotsResult.data ?? []) as FlaggedSpot[],
    ).map((s) => spotKey(s.pattern_name, s.quoted_text)),
  };
}
