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
  delete process.env.GEMINI_PAID_TIER;
});

test("Gemini is the provider serving feedback", async () => {
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

test("both model chains carry a fallback, so one dead model isn't an outage", async () => {
  const { modelChain } = await load();

  for (const tier of ["diagnostic", "conversation"] as const) {
    const chain = modelChain(tier);
    assert.ok(chain.length > 1, `${tier} chain needs a fallback`);
    assert.match(chain[0], /gemini/);
  }
});

test("a comparison is never served by a model that answers it by position", async () => {
  // Measured on two drafts of one essay: gemini-3.5-flash-lite picked whichever
  // was presented second, six times out of six, with the writing playing no
  // part. gemini-3.6-flash chose the same draft in both orders. A verdict is
  // one word the student acts on, and it carries nothing they could use to
  // tell a real judgement from a coin toss — so the comparison chain has no
  // lite fallback and fails instead of guessing.
  const { modelChain } = await load();
  const chain = modelChain("comparison");
  assert.ok(chain.length > 0);
  for (const model of chain) {
    assert.doesNotMatch(model, /lite/, `${model} is in the comparison chain`);
  }
  // The diagnostic read keeps its lite fallback: a card names its own line and
  // carries its own question, so a weaker read is visibly weaker.
  assert.ok(modelChain("diagnostic").some((m) => /lite/.test(m)));
});
