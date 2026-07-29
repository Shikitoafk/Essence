import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ENGINE_REFINEMENTS,
  ENGINE_SYSTEM_PROMPT,
  MODE_A_SYSTEM,
  MODE_B_SYSTEM,
} from "./systemPrompt";

test("both modes carry the full engine spec", () => {
  for (const system of [MODE_A_SYSTEM, MODE_B_SYSTEM]) {
    // Spot-check one line from each major region of the spec.
    assert.ok(system.includes("Never rewrite the student's essay."));
    assert.ok(system.includes("Matryoshka principle"));
    assert.ok(system.includes("Superman syndrome"));
    assert.ok(system.includes("Generic closing claim"));
    assert.ok(system.includes("Never flatter a weak essay."));
  }
});

test("Mode A carries the field refinements, Mode B does not", () => {
  assert.ok(MODE_A_SYSTEM.includes(ENGINE_REFINEMENTS));
  // The refinements shape the diagnostic read; the chat loop has no use for them
  // and paying for those tokens on every turn would be waste.
  assert.ok(!MODE_B_SYSTEM.includes("Field Refinements"));
});

test("the interest-coherence check keeps its guard rails", () => {
  // The check is only safe because it is narrow. If these ever drop out, the
  // engine starts nitpicking healthy metaphors.
  assert.ok(ENGINE_REFINEMENTS.includes("ONLY when ALL of the following hold"));
  assert.ok(ENGINE_REFINEMENTS.includes("A resonant image is not an error."));
  assert.ok(ENGINE_REFINEMENTS.includes("do not flag it"));
});

test("each mode gets its own output contract and not the other's", () => {
  assert.ok(MODE_A_SYSTEM.includes("<<<CARD>>>"));
  assert.ok(MODE_A_SYSTEM.includes("<<<SECTION:7>>>"));
  assert.ok(!MODE_A_SYSTEM.includes('"verdict"'));

  assert.ok(MODE_B_SYSTEM.includes('"verdict"'));
  assert.ok(MODE_B_SYSTEM.includes("needs_narrower"));
  assert.ok(!MODE_B_SYSTEM.includes("<<<CARD>>>"));
});

test("the verbatim spec is not edited in place", () => {
  // Refinements belong in ENGINE_REFINEMENTS so the original spec stays
  // traceable against essay_nudge_system_prompt.md.
  assert.ok(!ENGINE_SYSTEM_PROMPT.includes("Field Refinements"));
  assert.ok(!ENGINE_SYSTEM_PROMPT.includes("<<<SECTION"));
});
