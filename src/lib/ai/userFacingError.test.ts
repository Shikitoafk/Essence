import assert from "node:assert/strict";
import { test } from "node:test";
import { userFacingError } from "./llm";
import { LlmCallError, LlmConfigError } from "./llmTypes";

/**
 * Raw provider errors must never reach a student's screen. A real 413 from Groq
 * carried the account's organization id; others quote vendor names, model ids
 * and quota figures. These pin the sanitiser.
 */

// Keep the suite's output clean — userFacingError logs the real cause by design.
const silence = () => {
  const original = console.error;
  console.error = () => {};
  return () => {
    console.error = original;
  };
};

function sanitised(error: unknown) {
  const restore = silence();
  try {
    return userFacingError(error, "test");
  } finally {
    restore();
  }
}

const LEAKY = [
  'Request too large for model `openai/gpt-oss-120b` in organization `org_01kv641gxkeqv8h3kpdr5xw9cd` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Requested 21528',
  "Every Gemini model in this tier is out of free-tier quota right now.",
  "429 RESOURCE_EXHAUSTED: gemini-3.6-flash quota exceeded for project 12345",
];

const FORBIDDEN = [
  /gemini/i,
  /groq/i,
  /gpt-oss/i,
  /llama/i,
  /org_/i,
  /quota/i,
  /\bTPM\b/,
  /token/i,
  /\bapi[_ ]?key\b/i,
];

test("no provider, model, account or quota detail survives sanitising", () => {
  for (const detail of LEAKY) {
    for (const retryable of [true, false]) {
      const { message } = sanitised(new LlmCallError(detail, retryable));
      for (const pattern of FORBIDDEN) {
        assert.doesNotMatch(
          message,
          pattern,
          `"${message}" leaked ${pattern} from: ${detail.slice(0, 40)}…`,
        );
      }
    }
  }
});

test("a missing API key never tells the student which key", () => {
  const { message, status } = sanitised(
    new LlmConfigError("GEMINI_API_KEY is not set. Add it to .env.local."),
  );
  assert.doesNotMatch(message, /GEMINI|API_KEY|env/i);
  assert.equal(status, 503);
});

test("retryable failures invite a retry and set Retry-After", () => {
  const { status, retryAfterSeconds } = sanitised(
    new LlmCallError("503 upstream exploded", true),
  );
  assert.equal(status, 503);
  assert.equal(retryAfterSeconds, 60);
});

test("an actionable hint reaches the student, its technical cause does not", () => {
  const { message, status } = sanitised(
    new LlmCallError(
      "Draft exceeds the per-minute token budget of llama-3.3-70b-versatile",
      false,
      "This draft is longer than Essence can read in one pass right now. Try again with a shorter version.",
    ),
  );
  assert.match(message, /shorter version/);
  assert.doesNotMatch(message, /llama|token|budget/i);
  // The student caused it and can fix it, so it isn't a server error.
  assert.equal(status, 400);
});

test("unknown throwables fall back to a generic message", () => {
  const { message, status } = sanitised(
    new Error("ECONNREFUSED 10.0.0.5:443 internal-service"),
  );
  assert.doesNotMatch(message, /ECONN|10\.0\.0\.5|internal/i);
  assert.equal(status, 502);
});
