import { GoogleGenAI } from "@google/genai";
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

let client: GoogleGenAI | null = null;

/**
 * Gemini provider.
 *
 * Each tier is a fallback chain: when a model is out of quota or unavailable we
 * walk to the next one rather than failing the request. Override either chain
 * with a comma-separated env var if your key's model access differs.
 */
const DEFAULT_CHAINS: Record<ModelTier, string[]> = {
  diagnostic: [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
  ],
  conversation: [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
  ],
  /*
   * Comparison has its own chain, and it is the diagnostic one without the
   * lite fallback.
   *
   * Measured: asked to choose between two drafts of the same essay,
   * gemini-3.5-flash-lite picked whichever was presented second, six times out
   * of six. Not a lean — the writing played no part. gemini-3.6-flash showed
   * none of it, choosing the same draft in both orders.
   *
   * A verdict is a single word the student acts on: submit this one. Falling
   * back to a model that answers it by position produces a coin toss wearing
   * the sentence "you should submit Version B", and there is nothing in the
   * output for the student to tell the difference by. Better to fail and say
   * the comparison is unavailable.
   */
  comparison: [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
  ],
};

export function geminiChain(tier: ModelTier): string[] {
  const override =
    tier === "conversation"
      ? process.env.GEMINI_MODEL_CONVERSATION
      : process.env.GEMINI_MODEL_DIAGNOSTIC;
  return resolveChain(override, DEFAULT_CHAINS[tier]);
}

/**
 * Whether this deployment's Gemini key is on a billed (paid) account.
 *
 * Not cosmetic. Google's Gemini API terms differ sharply by tier: on the unpaid
 * tier Google uses submitted content to improve its products, human reviewers
 * may read API input and output, and the terms say plainly "Do not submit
 * sensitive, confidential, or personal information to the Unpaid Services." On
 * the paid tier prompts and responses are not used for product improvement.
 *
 * College essays are personal information by any reading, so students have to
 * be told which of those two worlds they're in. The API can't report its own
 * billing status, so it's declared here and defaults to the cautious answer.
 */
export function geminiIsPaidTier(): boolean {
  return process.env.GEMINI_PAID_TIER === "true";
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new LlmConfigError(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export async function generateWithGemini({
  tier,
  system,
  prompt,
  json = false,
  temperature = 0.7,
  maxOutputTokens,
}: GenerateRequest): Promise<GenerateResult> {
  const ai = getClient();
  const chain = geminiChain(tier);
  let lastError = "";

  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: system,
            temperature,
            ...(maxOutputTokens ? { maxOutputTokens } : {}),
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        });

        const text = response.text?.trim();
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

  if (/quota|429|resource.?exhausted|rate/i.test(lastError)) {
    throw new LlmCallError(
      "Every Gemini model in this tier is out of free-tier quota right now. The daily limits reset on a rolling window — try again later.",
      true,
    );
  }
  throw new LlmCallError(
    `Could not reach any Gemini model (${chain.join(", ")}). Last error: ${lastError}`,
    true,
  );
}
