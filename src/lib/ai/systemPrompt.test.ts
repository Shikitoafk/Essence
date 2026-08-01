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

test("a deliberate, explained absence is protected from being flagged", () => {
  // The failure this prevents: a draft that says why a scene cannot be given
  // gets a card demanding that scene. Sophisticated drafts suffer most.
  assert.ok(ENGINE_REFINEMENTS.includes("An absence the draft explains is not a gap"));
  assert.ok(ENGINE_REFINEMENTS.includes("do not flag it"));
  assert.ok(ENGINE_REFINEMENTS.includes("never the"));
});

test("the engine must deduplicate its own findings", () => {
  // Checklist point 11 turned on the report itself: three labels for one gap
  // read as three problems and stall the follow-up conversation.
  assert.ok(ENGINE_REFINEMENTS.includes("One card per distinct gap"));
  assert.ok(ENGINE_REFINEMENTS.includes("would two or more of these cards close at"));
});

test("confidence is defined at every level, not just high", () => {
  for (const level of ["**high**", "**medium**", "**low**"]) {
    assert.ok(
      ENGINE_REFINEMENTS.includes(level),
      `${level} needs a definition or the scale collapses to decoration`,
    );
  }
});

test("the prose diagnosis is required to become a card", () => {
  // The sharpest observation must not die in the summary while lesser findings
  // get cards the student can actually act on.
  // Matched without spanning a line wrap, since the prompt is hard-wrapped.
  assert.ok(ENGINE_REFINEMENTS.includes("to appear as a spot card"));
  assert.ok(ENGINE_REFINEMENTS.includes("Balloon + Needle"));
  assert.ok(ENGINE_REFINEMENTS.includes("die in the summary"));
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
