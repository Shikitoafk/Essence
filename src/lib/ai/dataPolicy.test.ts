import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

/**
 * The privacy page renders straight from dataPolicy(). If it ever claims
 * personal content is safe when the active provider's terms permit training,
 * the app lies to students about where their essays go — so the branches are
 * pinned here.
 *
 * The module reads process.env at call time, so a fresh import isn't needed.
 */
const load = async () => import("./llm");

beforeEach(() => {
  delete process.env.AI_PROVIDER;
  delete process.env.GEMINI_PAID_TIER;
});

test("defaults to Gemini so existing deployments are unchanged", async () => {
  const { activeProvider } = await load();
  assert.equal(activeProvider(), "gemini");
});

test("unpaid Gemini is never presented as safe for personal content", async () => {
  const { dataPolicy } = await load();
  const policy = dataPolicy();

  assert.equal(policy.safeForPersonalContent, false);
  // Google's own sentence has to reach the student verbatim.
  assert.match(policy.summary, /Do not submit sensitive/);
  assert.match(policy.summary, /human reviewers/);
});

test("paid Gemini flips to the paid-tier statement", async () => {
  process.env.GEMINI_PAID_TIER = "true";
  const { dataPolicy } = await load();
  const policy = dataPolicy();

  assert.equal(policy.safeForPersonalContent, true);
  assert.match(policy.summary, /not used to improve/);
  assert.doesNotMatch(policy.summary, /Do not submit sensitive/);
});

test("only the exact string 'true' counts as paid — no accidental opt-in", async () => {
  const { dataPolicy } = await load();
  for (const value of ["", "false", "1", "yes", "TRUE"]) {
    process.env.GEMINI_PAID_TIER = value;
    assert.equal(
      dataPolicy().safeForPersonalContent,
      false,
      `${JSON.stringify(value)} must not be read as paid`,
    );
  }
});

test("Groq is safe on every plan, regardless of the Gemini billing flag", async () => {
  process.env.AI_PROVIDER = "groq";
  const { dataPolicy, activeProvider } = await load();

  assert.equal(activeProvider(), "groq");
  const policy = dataPolicy();
  assert.equal(policy.providerLabel, "Groq");
  // The whole reason Groq is offered: no training, free plan included.
  assert.equal(policy.safeForPersonalContent, true);
  assert.match(policy.summary, /train or fine-tune/);
  assert.match(policy.summary, /free one/);
});

test("each provider's model chains are distinct and non-empty", async () => {
  const { modelChain } = await load();

  const geminiDiagnostic = modelChain("diagnostic");
  assert.ok(geminiDiagnostic.length > 1, "chains need a fallback");
  assert.match(geminiDiagnostic[0], /gemini/);

  process.env.AI_PROVIDER = "groq";
  const groqDiagnostic = modelChain("diagnostic");
  assert.ok(groqDiagnostic.length > 1);
  assert.doesNotMatch(groqDiagnostic[0], /gemini/);
});
