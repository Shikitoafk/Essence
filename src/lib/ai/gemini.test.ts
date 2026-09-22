import assert from "node:assert/strict";
import { test } from "node:test";
import { GEMINI_HTTP_OPTIONS, geminiChain } from "./gemini";

test("the SDK cannot exhaust the function lifetime retrying one model", () => {
  assert.equal(GEMINI_HTTP_OPTIONS.retryOptions.attempts, 1);
});

test("comparison does not inherit a diagnostic model override", () => {
  const diagnostic = process.env.GEMINI_MODEL_DIAGNOSTIC;
  const comparison = process.env.GEMINI_MODEL_COMPARISON;
  try {
    process.env.GEMINI_MODEL_DIAGNOSTIC = "diagnostic-only";
    delete process.env.GEMINI_MODEL_COMPARISON;
    assert.equal(geminiChain("comparison").includes("diagnostic-only"), false);
    assert.deepEqual(geminiChain("diagnostic"), ["diagnostic-only"]);
    process.env.GEMINI_MODEL_COMPARISON = "comparison-one,comparison-two";
    assert.deepEqual(geminiChain("comparison"), ["comparison-one", "comparison-two"]);
  } finally {
    if (diagnostic === undefined) delete process.env.GEMINI_MODEL_DIAGNOSTIC;
    else process.env.GEMINI_MODEL_DIAGNOSTIC = diagnostic;
    if (comparison === undefined) delete process.env.GEMINI_MODEL_COMPARISON;
    else process.env.GEMINI_MODEL_COMPARISON = comparison;
  }
});
