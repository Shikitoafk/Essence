import {
  LlmCallError,
  LlmConfigError,
  isTransient,
  resolveChain,
  shouldFallOver,
  type GenerateRequest,
  type GenerateResult,
  type ModelTier,
} from "./llmTypes";

/**
 * Groq provider.
 *
 * Chosen for a privacy reason as much as a cost one: Groq's Services Agreement
 * (§4.2) states Groq "is not permitted to use Inputs or Outputs for training or
 * fine-tuning any AI Model Services or other models" without explicit customer
 * permission, and that commitment is not split between free and paid plans.
 * Inference requests are not retained by default. For a tool handling personal
 * application essays that is a materially better default than an unpaid tier
 * whose terms permit training and human review.
 *
 * The API is OpenAI-compatible, so a plain fetch is enough — no SDK needed.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/*
 * Ordered by free-tier tokens-per-minute budget, not by raw model strength.
 *
 * The engine's system prompt is ~5.5k tokens and rides along on every call, so
 * TPM — not model quality — is what decides whether a request is servable at
 * all. Free-tier TPM: llama-3.3-70b 12K, gpt-oss-120b and -20b 8K,
 * llama-3.1-8b 6K. gpt-oss-120b is the stronger analyst but its 8K budget
 * leaves under 2k for output once the prompt and essay are in, which is not
 * enough for a full Mode A report — so it sits behind the model that fits.
 * On a paid Groq plan the budgets rise and it becomes viable again.
 */
const DEFAULT_CHAINS: Record<ModelTier, string[]> = {
  diagnostic: [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
  ],
  conversation: [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
  ],
};

export function groqChain(tier: ModelTier): string[] {
  const override =
    tier === "diagnostic"
      ? process.env.GROQ_MODEL_DIAGNOSTIC
      : process.env.GROQ_MODEL_CONVERSATION;
  return resolveChain(override, DEFAULT_CHAINS[tier]);
}

/**
 * The completion ceiling has to thread two needles at once.
 *
 * Too low and the report truncates: Groq defaults reasoning models to 1024, and
 * reasoning tokens come out of the same budget, so the spot cards and question
 * queue fall off the end and the student is handed a bland summary that flags
 * nothing.
 *
 * Too high and the request is refused outright: the ceiling counts against the
 * per-minute token budget, so asking for 16k on a 12K/min model is a 413 before
 * a single token is generated.
 *
 * These sit under the 12K budget with the ~6.5k of prompt and essay already in
 * the request, while still leaving comfortably more than the ~2.5k a full
 * report needs. Raise them via env on a paid Groq plan.
 */
const DEFAULT_MAX_TOKENS: Record<ModelTier, number> = {
  diagnostic: 4000,
  conversation: 2000,
};

function maxTokensFor(tier: ModelTier): number {
  const override =
    tier === "diagnostic"
      ? process.env.GROQ_MAX_TOKENS_DIAGNOSTIC
      : process.env.GROQ_MAX_TOKENS_CONVERSATION;
  const parsed = Number(override);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : DEFAULT_MAX_TOKENS[tier];
}

/** GPT-OSS models let us buy analysis depth directly; the deep read wants it. */
const REASONING_EFFORT: Record<ModelTier, "low" | "medium" | "high"> = {
  diagnostic: "high",
  conversation: "low",
};

function supportsReasoningEffort(model: string): boolean {
  return /gpt-oss/i.test(model);
}

export async function generateWithGroq({
  tier,
  system,
  prompt,
  json = false,
  temperature = 0.7,
  maxOutputTokens,
}: GenerateRequest): Promise<GenerateResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new LlmConfigError(
      "GROQ_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }

  const chain = groqChain(tier);
  let lastError = "";

  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature,
            max_completion_tokens: maxOutputTokens ?? maxTokensFor(tier),
            ...(supportsReasoningEffort(model)
              ? {
                  reasoning_effort: REASONING_EFFORT[tier],
                  // Groq requires this to be parsed or hidden in JSON mode; we
                  // never want the chain of thought in the body either way.
                  reasoning_format: "hidden",
                }
              : {}),
            ...(json ? { response_format: { type: "json_object" } } : {}),
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`${response.status} ${body.slice(0, 300)}`);
        }

        const payload = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = payload.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error("The model returned an empty response.");

        return { text, model };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (isTransient(lastError) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        if (shouldFallOver(lastError) || isTransient(lastError)) break;

        throw new LlmCallError(lastError, false);
      }
    }
  }

  // These reach the operator's logs via userFacingError, never the student.
  if (/413|too large|context length/i.test(lastError)) {
    throw new LlmCallError(
      `Draft exceeds the per-minute token budget of every model in the chain (${chain.join(", ")}). Shorten the draft, raise GROQ_MAX_TOKENS_*, or move to a paid plan.`,
      false,
      "This draft is longer than Essence can read in one pass right now. Try again with a shorter version.",
    );
  }
  if (/429|quota|rate.?limit/i.test(lastError)) {
    throw new LlmCallError(
      "Groq free-tier rate limit reached across the whole chain.",
      true,
    );
  }
  throw new LlmCallError(
    `Could not reach any Groq model (${chain.join(", ")}). Last error: ${lastError}`,
    true,
  );
}
