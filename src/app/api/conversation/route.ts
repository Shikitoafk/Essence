import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODE_B_SYSTEM } from "@/lib/ai/systemPrompt";
import { generate, parseJsonBody, userFacingError } from "@/lib/ai/llm";
import { checkRateLimit, recordUsage } from "@/lib/rateLimit";
import type { ConversationMessage, Essay, FlaggedSpot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ModeBReply {
  reply: string;
  verdict: "resolved" | "needs_narrower" | "skipped";
  facts?: string[];
  sensitive?: boolean;
}

/**
 * Mode B — one Socratic turn. Deliberately short-context: this never re-sends
 * the essay, only the one spot card being worked plus the Q&A so far. That's
 * what keeps the follow-up loop inside the free tier.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { essayId?: string; spotId?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const { essayId, spotId } = body;
  const message = (body.message ?? "").trim();

  if (!essayId || !spotId || !message) {
    return NextResponse.json(
      { error: "essayId, spotId and message are all required." },
      { status: 400 },
    );
  }

  const [{ data: essay }, { data: spot }] = await Promise.all([
    supabase.from("essays").select("*").eq("id", essayId).single<Essay>(),
    supabase
      .from("flagged_spots")
      .select("*")
      .eq("id", spotId)
      .eq("essay_id", essayId)
      .single<FlaggedSpot>(),
  ]);

  if (!essay || !spot) {
    return NextResponse.json(
      { error: "That essay or flagged spot no longer exists." },
      { status: 404 },
    );
  }

  const limit = await checkRateLimit(supabase, user.id, "conversation");
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

  // Persist the student's turn first — if the model call fails they don't lose
  // what they typed.
  await supabase.from("conversation_messages").insert({
    essay_id: essayId,
    flagged_spot_id: spotId,
    role: "user",
    content: message,
  });

  const [{ data: history }, { data: facts }] = await Promise.all([
    supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("flagged_spot_id", spotId)
      .order("created_at", { ascending: true })
      .limit(20),
    supabase
      .from("essay_facts")
      .select("fact")
      .eq("user_id", user.id)
      .eq("is_sensitive", false)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const prompt = buildModeBPrompt(
    spot,
    (history ?? []) as Pick<ConversationMessage, "role" | "content">[],
    (facts ?? []).map((f) => f.fact as string),
    essay.word_limit,
  );

  let parsed: ModeBReply;
  try {
    const result = await generate({
      tier: "conversation",
      system: MODE_B_SYSTEM,
      prompt,
      json: true,
      temperature: 0.8,
      // No explicit ceiling: reasoning models draw thinking tokens from the same
      // budget, and a cap sized for the visible reply truncates the JSON body.
    });
    // A malformed JSON body throws here too; the student's message is already
    // saved either way, so they can just send again.
    parsed = parseJsonBody<ModeBReply>(result.text);
  } catch (error) {
    const safe = userFacingError(error, "conversation turn");
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

  await recordUsage(supabase, user.id, "conversation");

  const reply = (parsed.reply ?? "").trim();
  const verdict: ModeBReply["verdict"] =
    parsed.verdict === "resolved" || parsed.verdict === "skipped"
      ? parsed.verdict
      : "needs_narrower";

  if (!reply) {
    console.error("[essence] conversation turn produced an empty reply");
    return NextResponse.json(
      { error: "That didn't come through. Try sending it again." },
      { status: 502 },
    );
  }

  await supabase.from("conversation_messages").insert({
    essay_id: essayId,
    flagged_spot_id: spotId,
    role: "assistant",
    content: reply,
  });

  // Season memory. Nothing the student flagged as private is ever written down.
  if (!parsed.sensitive && Array.isArray(parsed.facts) && parsed.facts.length) {
    const rows = parsed.facts
      .map((f) => String(f).trim())
      .filter((f) => f.length > 0 && f.length < 500)
      .slice(0, 6)
      .map((fact) => ({
        essay_id: essayId,
        user_id: user.id,
        fact,
        is_sensitive: false,
      }));
    if (rows.length) await supabase.from("essay_facts").insert(rows);
  }

  let nextSpot: { id: string; question: string } | null = null;

  if (verdict !== "needs_narrower") {
    await supabase
      .from("flagged_spots")
      .update({ status: verdict === "resolved" ? "resolved" : "skipped" })
      .eq("id", spotId);

    const { data: next } = await supabase
      .from("flagged_spots")
      .select("id, question")
      .eq("essay_id", essayId)
      .eq("status", "open")
      .neq("id", spotId)
      .order("queue_position", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string; question: string }>();

    // Reported, not posted. The student decides when the next question arrives;
    // the workspace asks for it explicitly. Answering one question should never
    // conscript you into the next.
    if (next) nextSpot = next;
  }

  return NextResponse.json({
    ok: true,
    reply,
    verdict,
    nextSpot,
  });
}

function buildModeBPrompt(
  spot: FlaggedSpot,
  history: Pick<ConversationMessage, "role" | "content">[],
  facts: string[],
  wordLimit: number | null,
): string {
  const parts: string[] = [];

  parts.push(
    `You are working ONE flagged spot. Here is its card — this is the only part of the essay under discussion right now:

Pattern: ${spot.pattern_name}
Confidence: ${spot.confidence}
The line from the draft, verbatim: "${spot.quoted_text}"
What is clear: ${spot.what_is_clear}
What is still unexplored: ${spot.what_is_unexplored}
Why it matters here: ${spot.why_it_matters}
The question you asked about it: ${spot.question}`,
  );

  if (wordLimit) parts.push(`The essay's word limit is ${wordLimit}.`);

  if (facts.length > 0) {
    parts.push(
      `Things this student has already told you this season — reference them naturally instead of re-asking:\n${facts
        .map((f) => `- ${f}`)
        .join("\n")}`,
    );
  }

  parts.push(
    `The exchange on this spot so far, oldest first:\n${history
      .map(
        (m) => `${m.role === "assistant" ? "You" : "Student"}: ${m.content}`,
      )
      .join("\n\n")}`,
  );

  parts.push(
    "Judge the student's most recent message against the Mode B rules and reply using the Mode B output contract. Remember: never write any part of the essay for them.",
  );

  return parts.join("\n\n");
}
