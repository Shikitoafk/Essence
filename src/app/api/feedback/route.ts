import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODE_A_SYSTEM } from "@/lib/ai/systemPrompt";
import { generate, userFacingError } from "@/lib/ai/llm";
import { locateQuote, parseModeAReport } from "@/lib/ai/parseReport";
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

  const context = await buildSeasonContext(supabase, user.id, essay, draft);

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
    priorities: report.priorities,
    strengths: report.strengths,
    readiness,
    readiness_why: report.readiness_why,
    readiness_next: report.readiness_next,
    // Same anchoring rule as the spot cards: a passage the student is told to
    // protect has to actually be in their draft.
    working_well: report.working_well
      .map((item) => {
        const located = locateQuote(draft, item.quote);
        return located ? { quote: located.text, why: item.why } : null;
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
  });
}

interface SeasonContext {
  facts: string[];
  otherEssays: { title: string; kind: string }[];
  previouslyResolved: string[];
  /** Which round of feedback this is — 1 for a first read. */
  round: number;
  /** The stage the previous read landed on, if there was one. */
  previousReadiness: string | null;
  /** True when this draft is identical to the one last read. */
  draftUnchanged: boolean;
  /** Quotes the student explicitly said had nothing more in them. */
  setAside: string[];
  /** Identity of the previous run's findings, for the stability check. */
  previousSpotKeys: string[];
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

function buildModeAPrompt(
  essay: Essay,
  draft: string,
  context: SeasonContext,
): string {
  const parts: string[] = [];

  parts.push(
    essay.essay_kind === "supplemental"
      ? "This is a SUPPLEMENTAL essay. First infer the exact task from the student's pasted prompt, then apply only the checks that task requires. Do NOT assume it is a Why Us essay."
      : "This is a PERSONAL STATEMENT.",
  );

  parts.push(`Essay title: ${essay.title}`);
  if (essay.school) parts.push(`Target school: ${essay.school}`);
  parts.push(
    essay.prompt_text
      ? `The prompt the student is answering:\n${essay.prompt_text}`
      : "The student did not paste the prompt. Do not assume one.",
  );
  parts.push(
    essay.word_limit
      ? `Word limit: ${essay.word_limit}. Current draft: ${countWords(draft)} words.`
      : `No word limit set. Current draft: ${countWords(draft)} words. Ask the student for the limit if it matters.`,
  );

  if (context.facts.length > 0) {
    /*
     * These come from every essay the student has worked on, not just this one.
     * Left unqualified, the engine read them as facts about THIS draft's author
     * and faulted the essay for "dropping" a laboratory interest that belonged
     * to a different essay entirely — inventing a deficiency out of season
     * memory. The framing has to be explicit about what these are for.
     */
    parts.push(
      `Things this student has told you while working on their essays THIS SEASON — possibly on a different essay than this one:
${context.facts.map((f) => `- ${f}`).join("\n")}

Use these only to ask better questions and to avoid re-asking what you already know. They are NOT requirements for this draft. This essay is under no obligation to mention any of them, and an omission here is not a finding: never write that the draft "drops", "omits" or "fails to mention" something that appears only in this list. Judge the draft on what it is trying to do, not on material from another essay.`,
    );
  }

  if (context.otherEssays.length > 0) {
    parts.push(
      `The student's other essays this season:\n${context.otherEssays
        .map((e) => `- ${e.title} (${e.kind})`)
        .join(
          "\n",
        )}\nIf this draft reveals the same facet of the person as one of those rather than a complementary one, flag it under checklist point 11.`,
    );
  }

  if (context.previouslyResolved.length > 0) {
    parts.push(
      `Passages already worked through and resolved in earlier rounds — don't re-flag them unless they've genuinely regressed:\n${context.previouslyResolved
        .map((q) => `- "${q}"`)
        .join("\n")}`,
    );
  }

  // The round number is what lets the engine tell real progress from circling,
  // and is the input to the readiness verdict in section 8.
  if (context.round === 1) {
    parts.push("This is the FIRST read of this essay.");
  } else if (context.draftUnchanged) {
    // The sharpest test of circling: an unchanged draft that comes back with a
    // fresh set of objections proves the findings were never the real ceiling.
    parts.push(
      `This is read number ${context.round}, and the draft is IDENTICAL to the one you read last time — not one word has been revised.${
        context.previousReadiness
          ? ` That read judged it "${context.previousReadiness}".`
          : ""
      } Nothing has been addressed, so nothing has improved and nothing has worsened: your verdict must be the same one, and your findings must be the same findings. Do NOT go looking for different problems in the same text — a new set of objections to an unrevised draft would mean the earlier read was incomplete or this one is invented. Say plainly that the draft is unchanged, restate what is still open, and tell the student that re-reading without revising cannot help them.`,
    );
  } else {
    parts.push(
      `This is read number ${context.round} of this essay.${
        context.previousReadiness
          ? ` The previous read judged it "${context.previousReadiness}".`
          : ""
      } If the problems from earlier rounds have genuinely been addressed, say so and rate what's left honestly. Do not manufacture a new tier of objections to justify this read.`,
    );
  }

  if (context.round >= SUPPRESS_POLISH_FROM_ROUND) {
    parts.push(
      `Round ${context.round}: raise your bar. Flag only what would genuinely change an admissions reader's impression of this applicant. Nothing you would describe as a matter of taste belongs in this read at all.`,
    );
  }

  if (context.setAside.length > 0) {
    parts.push(
      `The student already looked at these passages and said there was nothing more there. Do not raise them again under a different pattern name:\n${context.setAside
        .map((q) => `- "${q}"`)
        .join("\n")}`,
    );
  }

  parts.push(
    `Run Mode A on the draft below. Reply using the Mode A output contract exactly.\n\n--- BEGIN DRAFT ---\n${draft}\n--- END DRAFT ---`,
  );

  return parts.join("\n\n");
}
