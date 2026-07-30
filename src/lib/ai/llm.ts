import { geminiChain, geminiIsPaidTier, generateWithGemini } from "./gemini";
import { groqChain, generateWithGroq } from "./groq";
import type { GenerateRequest, GenerateResult, ModelTier } from "./llmTypes";

export {
  LlmCallError,
  LlmConfigError,
  type ModelTier,
  type GenerateResult,
} from "./llmTypes";

export type Provider = "gemini" | "groq";

/**
 * Which provider serves feedback. Defaults to Gemini so existing deployments
 * keep working untouched; set AI_PROVIDER=groq to switch.
 */
export function activeProvider(): Provider {
  return process.env.AI_PROVIDER === "groq" ? "groq" : "gemini";
}

export function modelChain(tier: ModelTier): string[] {
  return activeProvider() === "groq" ? groqChain(tier) : geminiChain(tier);
}

export async function generate(
  request: GenerateRequest,
): Promise<GenerateResult> {
  return activeProvider() === "groq"
    ? generateWithGroq(request)
    : generateWithGemini(request);
}

/**
 * What students must be told about where their essay goes, for the provider
 * actually in use. Kept beside the dispatch so the privacy page can never
 * describe a provider the app isn't using.
 */
export interface DataPolicy {
  providerLabel: string;
  /** True when the provider's terms bar training on submitted content. */
  safeForPersonalContent: boolean;
  summary: string;
}

export function dataPolicy(): DataPolicy {
  if (activeProvider() === "groq") {
    return {
      providerLabel: "Groq",
      safeForPersonalContent: true,
      // Services Agreement §4.2, and not split between free and paid plans.
      summary:
        "Groq's terms bar it from using your inputs or outputs to train or fine-tune any model, and this applies on every plan including the free one. Inference requests are not retained by default; Groq may log briefly only to investigate errors or abuse.",
    };
  }

  return geminiIsPaidTier()
    ? {
        providerLabel: "Google (Gemini API)",
        safeForPersonalContent: true,
        summary:
          "This deployment uses a paid Gemini account. Under Google's API terms your prompts and the responses are not used to improve Google's products or models; Google retains them briefly only to detect abuse and meet legal requirements.",
      }
    : {
        providerLabel: "Google (Gemini API)",
        safeForPersonalContent: false,
        summary:
          "This deployment uses Google's free Gemini tier. Under Google's terms for unpaid use, Google uses submitted content to develop and improve its products, and human reviewers may read your essay and your answers. Google's own terms say: “Do not submit sensitive, confidential, or personal information to the Unpaid Services.”",
      };
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
