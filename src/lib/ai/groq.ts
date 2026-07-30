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

const DEFAULT_CHAINS: Record<ModelTier, string[]> = {
  // Deep read: the most capable open model Groq serves, with reasoning.
  diagnostic: ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "openai/gpt-oss-20b"],
  // Chat turns: fast and cheap, since this fires on every reply.
  conversation: ["openai/gpt-oss-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
};

export function groqChain(tier: ModelTier): string[] {
  const override =
    tier === "diagnostic"
      ? process.env.GROQ_MODEL_DIAGNOSTIC
      : process.env.GROQ_MODEL_CONVERSATION;
  return resolveChain(override, DEFAULT_CHAINS[tier]);
}

/**
 * Groq defaults reasoning models to max_completion_tokens: 1024, and reasoning
 * tokens are drawn from that same budget. A full Mode A report needs roughly
 * 2,500 output tokens before any thinking, so the default silently truncates it
 * — the spot cards and question queue fall off the end and the student gets a
 * bland summary with nothing flagged. Always send an explicit ceiling.
 */
const DEFAULT_MAX_TOKENS: Record<ModelTier, number> = {
  diagnostic: 16000,
  conversation: 4000,
};

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
            max_completion_tokens: maxOutputTokens ?? DEFAULT_MAX_TOKENS[tier],
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

  if (/429|quota|rate.?limit/i.test(lastError)) {
    throw new LlmCallError(
      "Groq's free-tier limit is hit right now. Wait a minute and try again.",
      true,
    );
  }
  throw new LlmCallError(
    `Could not reach any Groq model (${chain.join(", ")}). Last error: ${lastError}`,
    true,
  );
}
