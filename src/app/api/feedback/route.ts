import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODE_A_SYSTEM } from "@/lib/ai/systemPrompt";
import { generate, LlmCallError, LlmConfigError } from "@/lib/ai/llm";
import { locateQuote, parseModeAReport } from "@/lib/ai/parseReport";
import { checkRateLimit, recordUsage } from "@/lib/rateLimit";
import {
  countWords,
  spotKey,
  MIN_DRAFT_WORDS,
  type Essay,
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
  if (words < MIN_DRAFT_WORDS) {
    return NextResponse.json(
      {
        error: `There's not much to read yet — ${words} word${words === 1 ? "" : "s"}. Write at least ${MIN_DRAFT_WORDS} before asking for feedback.`,
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

  const context = await buildSeasonContext(supabase, user.id, essay);

  let raw: string;
  let model: string;
  try {
    const result = await generate({
      tier: "diagnostic",
      system: MODE_A_SYSTEM,
      prompt: buildModeAPrompt(essay, draft, context),
      temperature: 0.6,
    });
    raw = result.text;
    model = result.model;
  } catch (error) {
    if (error instanceof LlmConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof LlmCallError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.retryable ? 503 : 502 },
      );
    }
    throw error;
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

  await supabase.from("essay_reports").insert({
    essay_id: essay.id,
    version_id: versionId,
    overall_impression: report.overall_impression,
    checklist_findings: report.checklist_findings,
    framework_findings: report.framework_findings,
    priorities: report.priorities,
    strengths: report.strengths,
  });

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
   * No question is posted here. The student asks for the first one from the
   * workspace when they're ready — a read can surface a lot at once, and being
   * handed a question before you've finished reading the diagnostic is exactly
   * the pressure this tool is supposed to avoid.
   */

  const carriedOver = rows.filter((row) => row.status !== "open").length;

  await supabase
    .from("essays")
    .update({ last_feedback_at: new Date().toISOString() })
    .eq("id", essay.id);

  return NextResponse.json({
    ok: true,
    model,
    versionId,
    spotCount: rows.length,
    droppedCount: ordered.length - rows.length,
    carriedOver,
    truncated,
  });
}

interface SeasonContext {
  facts: string[];
  otherEssays: { title: string; kind: string }[];
  previouslyResolved: string[];
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
): Promise<SeasonContext> {
  const [factsResult, essaysResult, resolvedResult] = await Promise.all([
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
      .select("quoted_text")
      .eq("essay_id", essay.id)
      .eq("status", "resolved")
      .limit(15),
  ]);

  return {
    facts: (factsResult.data ?? []).map((r) => r.fact as string),
    otherEssays: (essaysResult.data ?? []).map((r) => ({
      title: r.title as string,
      kind: r.essay_kind as string,
    })),
    previouslyResolved: (resolvedResult.data ?? []).map(
      (r) => r.quoted_text as string,
    ),
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
      ? "This is a SUPPLEMENTAL essay. Apply the Why Us framework and the supplemental-specific checks."
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
    parts.push(
      `Facts this student has already shared in earlier sessions (use them so questions build on what you know — never re-ask what's already answered):\n${context.facts
        .map((f) => `- ${f}`)
        .join("\n")}`,
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

  parts.push(
    `Run Mode A on the draft below. Reply using the Mode A output contract exactly.\n\n--- BEGIN DRAFT ---\n${draft}\n--- END DRAFT ---`,
  );

  return parts.join("\n\n");
}
