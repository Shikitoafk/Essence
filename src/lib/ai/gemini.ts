import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export class GeminiConfigError extends Error {}
export class GeminiCallError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError(
      "GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Two call sites, two very different cost profiles, so they get different tiers:
 *
 *  - `diagnostic` runs once per draft and reads the whole essay. It's worth a
 *    full Flash model even though the free tier only allows ~20 of them a day.
 *  - `conversation` runs on every chat turn with a short context. Flash Lite has
 *    500 requests/day on the free tier, which is what makes the Socratic loop
 *    actually usable.
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
};

export type ModelTier = "diagnostic" | "conversation";

export function modelChain(tier: ModelTier): string[] {
  const override =
    tier === "diagnostic"
      ? process.env.GEMINI_MODEL_DIAGNOSTIC
      : process.env.GEMINI_MODEL_CONVERSATION;

  const chain = (override ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  return chain.length > 0 ? chain : DEFAULT_CHAINS[tier];
}

/** Quota exhausted, or the key can't see this model — both mean "try the next one". */
function shouldFallOver(message: string): boolean {
  return /429|quota|rate.?limit|resource.?exhausted|404|not found|not supported|permission/i.test(
    message,
  );
}

function isTransient(message: string): boolean {
  return /500|502|503|504|timeout|overloaded|unavailable|empty response/i.test(
    message,
  );
}

interface GenerateOptions {
  tier: ModelTier;
  system: string;
  prompt: string;
  /** Ask the model for a raw JSON body (Mode B). */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateResult {
  text: string;
  /** Which model in the chain actually answered — surfaced in the UI. */
  model: string;
}

/**
 * One logical Gemini call. Walks the tier's model chain on quota/availability
 * errors, and retries once per model on a transient failure.
 */
export async function generate({
  tier,
  system,
  prompt,
  json = false,
  temperature = 0.7,
  maxOutputTokens,
}: GenerateOptions): Promise<GenerateResult> {
  const ai = getClient();
  const chain = modelChain(tier);
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
        if (!text) {
          throw new Error("The model returned an empty response.");
        }
        return { text, model };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (isTransient(lastError) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        // Move to the next model in the chain.
        if (shouldFallOver(lastError) || isTransient(lastError)) break;

        throw new GeminiCallError(lastError, false);
      }
    }
  }

  if (/quota|429|resource.?exhausted|rate/i.test(lastError)) {
    throw new GeminiCallError(
      "Every Gemini model in this tier is out of free-tier quota right now. The daily limits reset on a rolling window — try again later.",
      true,
    );
  }
  throw new GeminiCallError(
    `Could not reach any Gemini model (${chain.join(", ")}). Last error: ${lastError}`,
    true,
  );
}

/** Tolerates a model that wraps its JSON in a markdown fence despite instructions. */
export function parseJsonBody<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();
  else {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last > first) text = text.slice(first, last + 1);
  }
  return JSON.parse(text) as T;
}
