import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generate, userFacingError } from "@/lib/ai/llm";
import {
  buildTrialPrompt,
  MAX_TRIAL_WORDS,
  MIN_TRIAL_WORDS,
  parseTrialRead,
  TRIAL_SYSTEM,
} from "@/lib/ai/trialPrompt";
import { countWords } from "@/lib/types";
import { isAnonymousId } from "@/lib/productEvents";

export const runtime = "nodejs";
export const maxDuration = 60;

function visitorHashes(request: NextRequest, anonymousId: string) {
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const secret =
    process.env.TRIAL_RATE_LIMIT_SECRET ?? process.env.GEMINI_API_KEY ?? "";
  if (!secret) throw new Error("Trial rate-limit secret is not configured.");

  const hash = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  return {
    visitorHash: hash(`browser:${anonymousId}`),
    networkHash: hash(`network:${ip}`),
  };
}

async function releaseClaim(claimId: string) {
  const supabase = await createClient();
  await supabase.rpc("release_anonymous_trial", { p_claim_id: claimId });
}

export async function POST(request: NextRequest) {
  if (request.cookies.get("essence_trial_used")?.value === "1") {
    return NextResponse.json(
      { error: "You've already used today's free trial. Create an account to keep working with your essay." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const draft = typeof body.draft === "string" ? body.draft.trim() : "";
  const essayPrompt =
    typeof body.essayPrompt === "string"
      ? body.essayPrompt.trim().slice(0, 500)
      : "";
  const anonymousId = body.anonymousId;
  const words = countWords(draft);

  if (body.acceptedPolicy !== true) {
    return NextResponse.json(
      { error: "Read and accept the data note before sending an excerpt." },
      { status: 400 },
    );
  }
  if (!isAnonymousId(anonymousId)) {
    return NextResponse.json({ error: "Refresh the page and try again." }, { status: 400 });
  }
  if (words < MIN_TRIAL_WORDS || words > MAX_TRIAL_WORDS) {
    return NextResponse.json(
      { error: `Use an excerpt between ${MIN_TRIAL_WORDS} and ${MAX_TRIAL_WORDS} words.` },
      { status: 400 },
    );
  }

  let hashes: { visitorHash: string; networkHash: string };
  try {
    hashes = visitorHashes(request, anonymousId);
  } catch {
    return NextResponse.json(
      { error: "The trial isn't configured yet." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const { data: claimId, error: claimError } = await supabase.rpc(
    "claim_anonymous_trial",
    {
      p_visitor_hash: hashes.visitorHash,
      p_network_hash: hashes.networkHash,
    },
  );

  if (claimError) {
    console.error("[essence] anonymous trial claim failed:", claimError.message);
    return NextResponse.json(
      { error: "The trial isn't available yet. You can still create a free account." },
      { status: 503 },
    );
  }
  if (typeof claimId !== "string") {
    return NextResponse.json(
      { error: "Today's trial has already been used from this browser or network. Create an account to continue." },
      { status: 429 },
    );
  }

  try {
    const result = await generate({
      tier: "conversation",
      system: TRIAL_SYSTEM,
      prompt: buildTrialPrompt(draft, essayPrompt),
      json: true,
      temperature: 0.35,
      maxOutputTokens: 700,
    });
    const read = parseTrialRead(result.text, draft);
    console.info(`[essence] anonymous trial served by ${result.model}`);

    const { error: completeError } = await supabase.rpc(
      "complete_anonymous_trial",
      { p_claim_id: claimId },
    );
    if (completeError) {
      console.error("[essence] anonymous trial completion failed:", completeError.message);
    }

    const response = NextResponse.json(read);
    response.cookies.set("essence_trial_used", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  } catch (error) {
    await releaseClaim(claimId);
    const safe = userFacingError(error, "anonymous trial");
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
}
