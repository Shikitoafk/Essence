/** Shared vocabulary for the LLM providers, kept separate to avoid import cycles. */

export class LlmConfigError extends Error {}

export class LlmCallError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

/**
 * Two call sites, two very different cost profiles:
 *
 *  - `diagnostic` runs once per draft and reads the whole essay. Worth the
 *    strongest model available.
 *  - `conversation` runs on every chat turn with a short context. Wants a fast,
 *    cheap model with generous limits, because it fires constantly.
 */
export type ModelTier = "diagnostic" | "conversation";

export interface GenerateRequest {
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

/** Quota exhausted, or the key can't see this model — both mean "try the next one". */
export function shouldFallOver(message: string): boolean {
  return /429|quota|rate.?limit|resource.?exhausted|404|not found|not supported|permission|decommission|no longer/i.test(
    message,
  );
}

export function isTransient(message: string): boolean {
  return /500|502|503|504|timeout|overloaded|unavailable|empty response|fetch failed|ECONN/i.test(
    message,
  );
}

/** Reads a comma-separated model chain from an env var, falling back to defaults. */
export function resolveChain(
  override: string | undefined,
  fallback: string[],
): string[] {
  const chain = (override ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return chain.length > 0 ? chain : fallback;
}
