import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ENGINE_REFINEMENTS,
  ENGINE_SYSTEM_PROMPT,
  MODE_A_SYSTEM,
  MODE_B_ASK_SYSTEM,
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
  assert.ok(
    ENGINE_REFINEMENTS.includes("An absence the draft explains is not a gap"),
  );
  assert.ok(ENGINE_REFINEMENTS.includes("do not flag it"));
  assert.ok(ENGINE_REFINEMENTS.includes("never the"));
});

test("the engine must deduplicate its own findings", () => {
  // Checklist point 11 turned on the report itself: three labels for one gap
  // read as three problems and stall the follow-up conversation.
  assert.ok(ENGINE_REFINEMENTS.includes("One card per distinct gap"));
  assert.ok(
    ENGINE_REFINEMENTS.includes("would two or more of these cards close at"),
  );
});

test("cross-essay memory can never become a criticism", () => {
  /*
   * Observed on a real admitted essay: season memory from a different essay
   * leaked in, and the read faulted this draft for "dropping" a laboratory
   * interest that had never been in it. That breaks the spec's own rule against
   * inventing facts about the student, via a feature built to help them.
   */
  assert.ok(
    ENGINE_REFINEMENTS.includes(
      "Never fault a draft for material that isn't in it",
    ),
  );
  // Matched clear of the hard wrap in the prompt text.
  assert.ok(
    ENGINE_REFINEMENTS.includes("specification this draft has to satisfy"),
  );
  for (const verb of ['"drops"', '"omits"', '"fails to mention"']) {
    assert.ok(
      ENGINE_REFINEMENTS.includes(verb),
      `${verb} is the exact phrasing the failure took`,
    );
  }
  // Point 11 comparisons stay legal — those are about what the essays contain.
  assert.ok(ENGINE_REFINEMENTS.includes("checklist point 11"));
});

test("a closing reply cannot leave a question hanging", () => {
  /*
   * Observed: a "resolved" reply ended with a follow-up question. The interface
   * closes the exchange on that verdict and binds the input to the next spot,
   * so the student was left looking at a question they could not answer.
   * Wanting more from the passage is what needs_narrower is for.
   */
  assert.ok(MODE_B_SYSTEM.includes("MUST NOT end with a question"));
  assert.ok(MODE_B_SYSTEM.includes("cannot answer"));
  assert.ok(MODE_B_SYSTEM.includes("keep the exchange open"));
});

test("the question mode still refuses to write the essay", () => {
  // Added because the loop was one-way and students couldn't ask anything.
  // The risk in opening that channel is "just show me how to phrase it", so
  // the line between method and content has to survive in this mode too.
  assert.ok(MODE_B_ASK_SYSTEM.includes("Method, not content."));
  assert.ok(MODE_B_ASK_SYSTEM.includes("Write, draft, rephrase"));
  assert.ok(MODE_B_ASK_SYSTEM.includes("say plainly that you won't write it"));
  // It carries the whole engine spec, not just the question rules.
  assert.ok(MODE_B_ASK_SYSTEM.includes("Never rewrite the student's essay."));
  assert.ok(MODE_B_ASK_SYSTEM.includes("Never invent facts"));
});

test("asking is not answering, and must not be judged as one", () => {
  assert.ok(
    MODE_B_ASK_SYSTEM.includes("Do not treat their message as an answer"),
  );
  // Plain prose: the verdict machinery belongs to answers only.
  assert.ok(MODE_B_ASK_SYSTEM.includes("Reply with plain prose"));
  assert.ok(!MODE_B_ASK_SYSTEM.includes("needs_narrower"));
});

test("each refinement section has a unique letter", () => {
  // Two sections both labelled F once slipped through while renumbering.
  const letters = [...ENGINE_REFINEMENTS.matchAll(/^### ([A-Z])\./gm)].map(
    (m) => m[1],
  );
  assert.ok(letters.length > 0);
  assert.equal(new Set(letters).size, letters.length, letters.join(","));
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

test("a missing forward direction is a mandatory, structural check", () => {
  // Missed twice on the same draft while lesser findings got cards, so it is a
  // required verification rather than a note the engine can pass over.
  assert.ok(ENGINE_REFINEMENTS.includes("Mandatory final check"));
  assert.ok(ENGINE_REFINEMENTS.includes("a card saying so is mandatory"));
  assert.ok(ENGINE_REFINEMENTS.includes("ranked"));
  // It must not be satisfiable by a mention in the prose sections.
  assert.ok(ENGINE_REFINEMENTS.includes("Do not settle for"));
});

test("every top priority has to be anchored to a card", () => {
  // Observed: three priorities, two cards. The third was advice the student
  // could read but never work on, because only cards become questions.
  assert.ok(ENGINE_REFINEMENTS.includes("have a card in section 4"));
  // Matched clear of the hard wrap in the prompt text.
  assert.ok(ENGINE_REFINEMENTS.includes("Never leave a top priority"));
  assert.ok(ENGINE_REFINEMENTS.includes("stranded in prose"));
  // Dropping an unanchorable priority is the other honest way out, and doing
  // neither — which is what kept happening — is explicitly closed off.
  assert.ok(ENGINE_REFINEMENTS.includes("delete that priority"));
  assert.ok(ENGINE_REFINEMENTS.includes("Doing neither is not available"));
  assert.ok(ENGINE_REFINEMENTS.includes("Count them before you finish"));
});

test("a flat draft is caught even when nothing is missing from it", () => {
  /*
   * Reported by a reader trying the tool: keep the structure and it calls a
   * robotic essay strong — "живности не видит". Correct, and the cause was
   * structural. Every pattern in this prompt hunts for absent material, so a
   * draft with no gaps passed every check and got told it was finished.
   *
   * The test pins the escape hatch shut: the voice check has to be a mandatory
   * verification rated structural, with a concrete test rather than an appeal
   * to taste, and it has to keep its guard against flagging plain writing.
   */
  assert.ok(ENGINE_REFINEMENTS.includes("Is anyone in here?"));
  assert.ok(ENGINE_REFINEMENTS.includes("No one in the room"));

  // Concrete and anchorable, not "add more personality". Whitespace-tolerant:
  // the phrase spans a hard wrap in the prompt, and in both places it appears.
  assert.match(
    ENGINE_REFINEMENTS,
    /one sentence only this writer\s+could have written/,
  );

  // Structural, or the readiness verdict never sees it.
  assert.match(
    ENGINE_REFINEMENTS,
    /cannot find one, that is the finding, it is \*\*structural\*\*/,
  );

  // Named in the mandatory checks, not left as advice further up the prompt.
  const checks = ENGINE_REFINEMENTS.slice(
    ENGINE_REFINEMENTS.indexOf("Mandatory final check"),
  );
  assert.ok(checks.includes("Is anyone in here?"));

  // The guard rail matters as much as the rule: a quiet voice is still a voice.
  assert.ok(ENGINE_REFINEMENTS.includes("Do NOT flag plain writing"));
  assert.ok(ENGINE_REFINEMENTS.includes("competence is not the crime"));
});

test("the enumerated checklist is a floor the engine may exceed", () => {
  /*
   * Same report, wider form: the engine graded only against what was written
   * down, and an essay can fail in ways nobody enumerated. The permission has
   * to be explicit — with the invention guard still attached, or "name what you
   * see" becomes licence to pad.
   */
  assert.ok(ENGINE_REFINEMENTS.includes("floor, not a ceiling"));
  assert.ok(ENGINE_REFINEMENTS.includes("You are not a checklist runner"));
  assert.match(ENGINE_REFINEMENTS, /that is a finding and you must report it/);

  // The examples must be offered as illustrations, never as a new closed set.
  assert.ok(ENGINE_REFINEMENTS.includes("also not exhaustive"));

  // Guard rails survive the loosening.
  assert.ok(ENGINE_REFINEMENTS.includes("The guard rails do not loosen"));
  assert.match(ENGINE_REFINEMENTS, /not freedom to manufacture/);
  // Silence stays the right answer on an ordinary draft.
  assert.ok(ENGINE_REFINEMENTS.includes("say nothing"));
});

test("off-pattern findings get an accurate name, not a forced one", () => {
  // Observed: a detachment finding labelled "Generic closing claim" against a
  // line that was neither. The label contradicted its own card, and pattern
  // names are part of the dedup key, so a wrong one also splits identity.
  assert.ok(ENGINE_REFINEMENTS.includes("must NOT force them"));
  assert.ok(ENGINE_REFINEMENTS.includes("name it after the principle it"));
  assert.ok(ENGINE_REFINEMENTS.includes("better than a familiar, wrong one"));
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
