import { geminiChain, geminiIsPaidTier, generateWithGemini } from "./gemini";
import { groqChain, generateWithGroq } from "./groq";
import { LlmCallError, LlmConfigError } from "./llmTypes";
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

/**
 * Turns any failure from the feedback engine into something safe to show.
 *
 * Raw provider errors are not fit for a student's screen: they name the vendor
 * and model, quote quota and token budgets, and have been observed carrying
 * account identifiers (a 413 body included the org id). None of that helps the
 * person writing the essay, and some of it should not leave the server at all.
 *
 * The real error is logged for whoever operates the deployment; the caller gets
 * a plain message and a status.
 */
export function userFacingError(
  error: unknown,
  context: string,
): { message: string; status: number; retryAfterSeconds?: number } {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[essence] ${context} failed:`, detail);

  if (error instanceof LlmConfigError) {
    // An operator mistake, not the student's — say nothing about which key.
    return {
      message:
        "Essence isn't set up to give feedback right now. Please let whoever runs this site know.",
      status: 503,
    };
  }

  if (error instanceof LlmCallError) {
    // A hint is only set where the student can actually do something about it.
    if (error.userHint) {
      return { message: error.userHint, status: 400 };
    }
    if (error.retryable) {
      return {
        message:
          "Essence couldn't finish that just now. Give it a minute and try again.",
        status: 503,
        retryAfterSeconds: 60,
      };
    }
  }

  return {
    message: "Something went wrong on our side. Try that again in a moment.",
    status: 502,
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
