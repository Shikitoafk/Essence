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
