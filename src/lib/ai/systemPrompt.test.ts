import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EDITORIAL_CALIBRATION,
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
  // Merging is by location. The earlier test asked whether one added scene
  // would close both cards, which merged every gap an essay fixes the same
  // way — three separate missing aftermaths became one card.
  const normalized = ENGINE_REFINEMENTS.replace(/\s+/g, " ");
  assert.match(normalized, /do they point at the SAME moment in the draft/);
  assert.match(normalized, /Merge on location, never on the shape of the remedy/);
  assert.match(normalized, /Sharing a KIND of fix is not sharing a finding/);
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
  assert.match(ENGINE_REFINEMENTS, /die in\s+the summary/);
});

test("an open ending is not forced into a generic future plan", () => {
  // The engine may verify orientation, but it cannot demand a stock
  // forward-looking closure from a personal statement whose uncertainty is
  // doing real character work.
  assert.ok(ENGINE_REFINEMENTS.includes("Mandatory final check"));
  assert.ok(ENGINE_REFINEMENTS.includes("Do NOT demand a forward-looking resolution"));
  assert.ok(ENGINE_REFINEMENTS.includes("may end in uncertainty"));
  assert.match(ENGINE_REFINEMENTS, /Never\s+prescribe a future plan/);
});

test("a repeated metaphor is judged by what each recurrence adds", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("### P. A recurring image must earn each return"));
  assert.ok(ENGINE_REFINEMENTS.includes("function, not frequency"));
  assert.ok(ENGINE_REFINEMENTS.includes('"Mechanical motif"'));
  assert.ok(ENGINE_REFINEMENTS.includes("fails to add"));
  assert.ok(ENGINE_REFINEMENTS.includes("do not supply a replacement metaphor"));
});

test("supplementals are judged against their actual prompt, not a default Why Us rubric", () => {
  assert.ok(
    ENGINE_REFINEMENTS.includes(
      "### Q. A supplemental is an answer to a particular question",
    ),
  );
  assert.ok(ENGINE_REFINEMENTS.includes("Do not use the Why Us framework as"));
  assert.ok(ENGINE_REFINEMENTS.includes("Prompt mismatch"));
  assert.ok(ENGINE_REFINEMENTS.includes("student did not provide the prompt"));
  assert.ok(ENGINE_REFINEMENTS.includes("brevity can be a virtue"));
});

test("the full diagnostic covers every distinct gap instead of stopping at three cards", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("### R. Coverage, not triage"));
  const normalized = ENGINE_REFINEMENTS.replace(/\*/g, "").replace(/\s+/g, " ");
  assert.match(
    normalized,
    /not stop at three, rank the cards, or choose a small representative sample/i,
  );
  assert.match(normalized, /never a quota in either direction/);
  assert.match(normalized, /coverage read, not a teaser/);
  // Matched clear of the hard wraps in the prompt text.
  const normalizedModeA = MODE_A_SYSTEM.replace(/\s+/g, " ");
  assert.match(
    normalizedModeA,
    /Do not rank cards, create a top-three list, or introduce a new issue here/i,
  );
  // Cards now reconcile against the visible scan rather than against a
  // description of what counts as a gap.
  assert.match(
    normalizedModeA,
    /EVERY candidate in the scan above that you did not explicitly drop/,
  );
  assert.match(
    normalizedModeA,
    /a candidate that is neither carded nor listed as DROPPED is a finding you lost/,
  );
});

test("research calibration reaches diagnostic and both conversation modes after legacy rules", () => {
  for (const system of [MODE_A_SYSTEM, MODE_B_SYSTEM, MODE_B_ASK_SYSTEM]) {
    assert.ok(system.includes(EDITORIAL_CALIBRATION));
    assert.ok(system.indexOf(EDITORIAL_CALIBRATION) >= ENGINE_SYSTEM_PROMPT.length);
    assert.match(system, /not admission chances/);
    assert.match(system, /titles alone/);
    assert.match(system, /initial diagnosis as revisable/);
  }
});

test("research lenses distinguish substantive depth from formula compliance", () => {
  for (const lens of ["Specificity of thinking", "Relationships with agency", "Detail with a job", "Selection and progression", "Proportionate change", "Supplemental depth per word"]) {
    assert.ok(ENGINE_REFINEMENTS.includes(lens), lens);
  }
  assert.match(EDITORIAL_CALIBRATION, /Showing and telling can both work/);
  assert.match(EDITORIAL_CALIBRATION, /refusal to share/);
  assert.match(EDITORIAL_CALIBRATION, /Do not predict acceptance/);
});

test("a first detail does not automatically end a Socratic thread", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("one concrete noun or fact"));
  assert.ok(ENGINE_REFINEMENTS.includes("enough truthful raw material"));
  assert.ok(ENGINE_REFINEMENTS.includes("never continue questioning merely"));
});

test("every meaningful diagnosis has to become an anchored card", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("Does every meaningful diagnosis have a card in section 4?"));
  assert.ok(ENGINE_REFINEMENTS.includes("Never leave a meaningful problem"));
  assert.ok(ENGINE_REFINEMENTS.includes("stranded in prose"));
  assert.match(ENGINE_REFINEMENTS, /add one\s+anchored card, or remove the diagnosis/);
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

test("every critique is evidence-based and every question stays non-leading", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("### L. Earn every criticism"));
  assert.ok(ENGINE_REFINEMENTS.includes("causal chain"));
  assert.ok(ENGINE_REFINEMENTS.includes('"make it stronger"'));
  assert.ok(ENGINE_REFINEMENTS.includes("### M. Questions must uncover, not direct"));
  assert.ok(ENGINE_REFINEMENTS.includes("not a disguised suggestion"));
  assert.ok(ENGINE_REFINEMENTS.includes("I do not know"));
});

test("the queue is ordered by the reader's loss, not draft order", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("### N. Rank by the reader's loss"));
  assert.match(ENGINE_REFINEMENTS, /core self,\s*agency,\s*or direction/);
  assert.ok(ENGINE_REFINEMENTS.includes("load-bearing passage"));
});

test("the diagnostic has a free editorial read beyond named patterns", () => {
  assert.ok(ENGINE_REFINEMENTS.includes("### O. Read the essay, not just the rubric"));
  assert.ok(ENGINE_REFINEMENTS.includes("Personal voice:"));
  assert.ok(ENGINE_REFINEMENTS.includes("Emotional truth:"));
  assert.ok(ENGINE_REFINEMENTS.includes("Presence and energy:"));
  assert.ok(ENGINE_REFINEMENTS.includes("MUST become a card"));
  assert.ok(ENGINE_REFINEMENTS.includes("not a new closed checklist"));
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

test("the five patterns are a vocabulary, not the set of things worth a card", () => {
  // Section 4 used to read "For each flagged spot (using the five patterns
  // above)", which capped the cards at the pattern list while section H said
  // the opposite. Reads came back with three cards on drafts holding six or
  // seven distinct gaps.
  const normalized = MODE_A_SYSTEM.replace(/\s+/g, " ");
  assert.match(normalized, /a naming vocabulary, NOT the list of things worth flagging/);
  assert.match(normalized, /There is no target number here, and no ceiling/);
  assert.doesNotMatch(normalized, /For each flagged spot \(using the five patterns above\)/);
});

test("the read has to show its scan before it decides what to card", () => {
  // Restraint rules outnumber and out-specify the coverage rules in this
  // prompt, so telling the model not to stop at three did not move it off
  // three. Making the scan an output rather than an intention is what gives
  // the cards something to reconcile against.
  const normalized = MODE_A_SYSTEM.replace(/\s+/g, " ");
  assert.match(normalized, /<<<SCAN>>>/);
  assert.match(normalized, /<<<ENDSCAN>>>/);
  assert.match(normalized, /List every candidate before you judge any of them/);
  assert.match(normalized, /this block is the map, not the verdict/);
  // Dropping a candidate is allowed, but it has to be shown. "The draft
  // accounts for it" is what a model says when it wants a shorter report, and
  // two flash models used exactly that to drop real gaps.
  assert.match(normalized, /then quote the draft's own words that do the answering, verbatim/);
  assert.match(normalized, /If you cannot point at the sentence that closes the gap, the draft does not close it/);
  assert.match(normalized, /are claims about the draft, not quotes from it, and they do not drop anything/);
  assert.match(normalized, /a draft with six gaps gets six cards/);
});
