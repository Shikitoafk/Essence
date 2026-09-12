import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIAGNOSTIC_GUIDE,
  ENGINE_CORE,
  MODE_A_SYSTEM,
  MODE_B_ASK_SYSTEM,
  MODE_B_SYSTEM,
} from "./systemPrompt";

/*
 * These assert on prompt text, which is the only part of the engine that can be
 * checked without spending a model call. They prove a rule is present and has
 * not drifted; they prove nothing about how a model behaves when it reads it.
 * That is what scripts/run-eval-cases.ts is for.
 *
 * Every test here carries a requirement from the version before the rewrite.
 * The prompt was reorganised; none of these were meant to be dropped.
 */

/** Hard wraps in the prompt make raw substring matching fragile. */
const flat = (s: string) => s.replace(/\s+/g, " ");

const CORE = flat(ENGINE_CORE);
const GUIDE = flat(DIAGNOSTIC_GUIDE);
const MODE_A = flat(MODE_A_SYSTEM);

test("every mode carries the core, and only Mode A carries the reading guide", () => {
  // The split is deliberate: a conversation turn does not need the apparatus
  // for reading a whole draft, and paying for it on every reply made the
  // conversation slower without making it better.
  for (const mode of [MODE_A_SYSTEM, MODE_B_SYSTEM, MODE_B_ASK_SYSTEM]) {
    assert.ok(mode.includes(ENGINE_CORE));
  }
  assert.ok(MODE_A_SYSTEM.includes(DIAGNOSTIC_GUIDE));
  assert.ok(!MODE_B_SYSTEM.includes(DIAGNOSTIC_GUIDE));
  assert.ok(!MODE_B_ASK_SYSTEM.includes(DIAGNOSTIC_GUIDE));
});

test("the core carries no serialization markers", () => {
  // Formatting belongs to the per-mode contracts. A section marker leaking into
  // the shared core would tell Mode B to emit Mode A's envelope.
  assert.ok(!ENGINE_CORE.includes("<<<SECTION"));
  assert.ok(!ENGINE_CORE.includes("<<<CARD>>>"));
  assert.ok(!DIAGNOSTIC_GUIDE.includes("<<<CARD>>>"));
});

test("each mode gets its own output contract and not the other's", () => {
  assert.ok(MODE_A_SYSTEM.includes("<<<CARD>>>"));
  assert.ok(MODE_A_SYSTEM.includes("<<<SECTION:7>>>"));
  assert.ok(!MODE_A_SYSTEM.includes('"verdict"'));

  assert.ok(MODE_B_SYSTEM.includes('"verdict"'));
  assert.ok(MODE_B_SYSTEM.includes("needs_narrower"));
  assert.ok(!MODE_B_SYSTEM.includes("<<<CARD>>>"));
});

test("the read maps the whole draft before it judges anything", () => {
  // The reason three cards kept coming back: the model decided while it read,
  // so a gap it had noticed could be filtered before it was ever written down.
  assert.match(GUIDE, /You are not sampling the draft.*You are mapping it/);
  assert.match(GUIDE, /Do not judge any of them yet/);
  assert.match(GUIDE, /a candidate never written down is invisible/);
  assert.match(MODE_A, /<<<SCAN>>>/);
  assert.match(MODE_A, /List every candidate before you judge any of them/);
});

test("the card count follows the draft in both directions", () => {
  assert.match(GUIDE, /There is no target, no ceiling, and no representative sample/);
  assert.match(GUIDE, /Zero is a real answer/);
  // The cost of under-reporting, stated so it is not traded away for brevity.
  assert.match(GUIDE, /will fix three and submit an essay with three left in it/);
});

test("dropping a candidate requires a reason but not a defense of every omission", () => {
  assert.match(MODE_A, /Drop it with a quote and a reason/);
  assert.match(MODE_A, /The writer does not owe a defense of every omission/);
  assert.match(GUIDE, /Curiosity alone is not a cost/);
});
test("findings merge only when one actual revision resolves both", () => {
  assert.match(GUIDE, /Compare the actual revision each card requires/);
  assert.match(GUIDE, /If losses need independent changes, retain both/);
});

test("every critique is evidence-based", () => {
  assert.match(GUIDE, /A finding is a claim you have to prove, not an impression/);
  assert.match(GUIDE, /what that missing understanding costs \*\*this\*\* essay/);
  assert.match(GUIDE, /make it stronger.*add depth.*be more specific/);
  assert.match(GUIDE, /Do not write the card/);
});

test("a difference of taste is not a finding", () => {
  assert.match(GUIDE, /A difference between your taste and the writer's is not a finding at all/);
  assert.match(GUIDE, /If resolving it would not change the reader's picture of this applicant/);
});

test("questions uncover and never direct", () => {
  assert.match(GUIDE, /the question is not a suggestion in disguise/);
  assert.match(GUIDE, /must not contain an invented event, emotion, motive, person, detail or conclusion/);
  // A question that presupposes failure is as leading as one that presupposes
  // success. Observed: a case-3 read asked which moment of hesitation showed
  // the truth, on a draft that never said there was hesitation.
  assert.match(GUIDE, /Do not ask which moment of hesitation showed the truth unless the draft says there was hesitation/);
  assert.match(GUIDE, /as leading as one that presupposes a triumph/);
  assert.match(GUIDE, /answer "I do not know" without contradicting a premise you supplied/);
});

test("a personal portrait needs evidence, not an unprecedented sentence", () => {
  assert.match(GUIDE, /Describe the writer's actual perspective with evidence/);
  assert.match(GUIDE, /A topic or a list of virtues is not yet a portrait/);
  assert.match(GUIDE, /Plain writing is not flatness/);
  assert.ok(!GUIDE.includes("find one sentence only this writer could have written"));
  assert.match(CORE, /Judge the development of the writer's idea, not its novelty/);
});

test("the enumerated checklist is a floor the engine may exceed", () => {
  assert.match(GUIDE, /they are a floor rather than a ceiling/);
  assert.match(GUIDE, /No list is the set of things that can be wrong with an essay/);
  assert.match(GUIDE, /it is a finding and you report it/);
  // Freedom to name is not freedom to invent.
  assert.match(GUIDE, /The guard rails do not loosen/);
  assert.match(GUIDE, /Freedom to name what you see is not freedom to manufacture/);
});

test("off-pattern findings get an accurate name, not a forced one", () => {
  assert.match(GUIDE, /They are a vocabulary, not the set of things worth reporting/);
  assert.match(GUIDE, /name it after the principle it actually breaks/);
  assert.match(GUIDE, /A plain accurate name always beats a familiar wrong one/);
  for (const name of ["No one in the room", "Mechanical motif", "Prompt mismatch"]) {
    assert.ok(GUIDE.includes(name), name);
  }
});

test("the prose diagnosis is required to become a card", () => {
  // Section 4 is the only part of the report that becomes a highlighted line
  // and an answerable question. Measured: a read named the systematic-review
  // silence in checklist prose and never carded it.
  assert.match(GUIDE, /must also exist as a card in section 4/);
  assert.match(GUIDE, /a criticism left only in prose is advice they read once and cannot work on/);
  assert.match(GUIDE, /give it an anchored card, or remove the diagnosis/);
  assert.match(GUIDE, /quote the line that best represents it/);
});

test("confidence is defined at every level, not just high", () => {
  for (const level of ["high", "medium", "low"]) {
    assert.ok(GUIDE.includes(`**${level}**`), level);
  }
  assert.match(GUIDE, /A field that always reads high carries no information/);
  // Do not swing the other way and fake a spread.
  assert.match(GUIDE, /Do not manufacture a spread either/);
  assert.match(GUIDE, /Confidence is about the evidence for a finding, never about admission chances/);
});

test("the impact ratings are the verdict and cannot be gamed", () => {
  for (const impact of ["structural", "substantive", "polish"]) {
    assert.ok(GUIDE.includes(`**${impact}**`), impact);
  }
  assert.match(GUIDE, /reported to the student as ready to submit/);
  assert.match(GUIDE, /do not inflate a taste note into a structural problem/);
  assert.match(GUIDE, /do not soften a structural problem because the student has already revised/);
});

test("the queue is ordered by the reader's loss, not draft order", () => {
  assert.match(GUIDE, /Rank by what the reader loses, not by where you noticed it/);
  assert.match(GUIDE, /not the first weak sentence and not the easiest question to ask/);
  assert.match(GUIDE, /Never raise an impact rating to move a card forward/);
});

test("an open ending is not forced into a generic future plan", () => {
  assert.match(GUIDE, /Direction is not the same as a career plan/);
  assert.match(GUIDE, /an unresolved tension that belongs to this writer all count/);
  assert.match(GUIDE, /Never prescribe the plan or the closing line/);
  assert.match(CORE, /An essay may end in earned uncertainty/);
});

test("a repeated metaphor is judged by what each recurrence adds", () => {
  assert.match(GUIDE, /Trace every appearance of a recurring image/);
  assert.match(GUIDE, /The test is function, not frequency/);
  assert.match(GUIDE, /a quiet callback can be enough/);
});

test("the interest-coherence check keeps its guard rails", () => {
  // The check is only safe because it is narrow. If these drop out, the engine
  // starts nitpicking healthy metaphors.
  assert.match(GUIDE, /ONLY when ALL of the following hold/);
  assert.match(GUIDE, /A resonant image is not an error/);
  assert.match(GUIDE, /if you are in any doubt, do not flag it/);
  assert.match(GUIDE, /a false positive here costs the student a good line/);
});

test("the lenses look for thinking, other people, and the work a detail does", () => {
  assert.match(GUIDE, /the writer's actual mental work/);
  assert.match(GUIDE, /an unresolved question can reveal more than a finished lesson/);
  assert.match(GUIDE, /what another person actually did, said, preferred or refused/);
  assert.match(GUIDE, /Do not invent gratitude, assign motives to anyone/);
  assert.match(GUIDE, /A precise noun, a timestamp, a smell: none is revealing by itself/);
  // Proportionate change: a small action can be enough evidence.
  assert.match(GUIDE, /A small action is enough evidence/);
  assert.match(GUIDE, /A dramatic event is not proof of growth/);
});

test("the lenses are places to look, not requirements to satisfy", () => {
  // This is the sentence that stops the guide becoming a rubric the draft has
  // to pass. It is the whole difference between detailed and constraining.
  assert.match(GUIDE, /These are places to look, not a list of requirements to check off/);
  assert.match(GUIDE, /a lens that finds nothing is silence, not a finding/);
  assert.match(GUIDE, /None of them is a licence to invent/);
});

test("supplementals are judged against their actual prompt, not a default Why Us rubric", () => {
  assert.match(GUIDE, /The pasted prompt is the specification/);
  assert.match(GUIDE, /Why Us is not the default/);
  assert.match(GUIDE, /only\*\* to a prompt that actually asks why that institution/);
  assert.match(GUIDE, /brevity is a virtue/);
  // Without the prompt, the limit is stated rather than invented around.
  assert.match(GUIDE, /you cannot claim the draft fails to answer a question you were never shown/);
  assert.match(GUIDE, /do not manufacture a Why Us diagnosis from a title or a school name/);
});

test("the strengths section analyses rather than summarises", () => {
  assert.match(GUIDE, /A list of nothing but problems tells a student which lines to change and never which to protect/);
  assert.match(GUIDE, /explain why something works \*\*as writing\*\*/);
  assert.match(GUIDE, /is plot summary, not a strength/);
  assert.match(GUIDE, /two honest sentences\s+beat a padded page/);
  // The ban on age-based headings was producing them: five reads in a row
  // emitted "For a 10-year-old" under a line forbidding it by name. The
  // section is specified by a worked register now, not by a prohibition.
  assert.ok(!GUIDE.includes("age-based headings"));
  assert.match(GUIDE, /Both sentences name an effect and say what produces it/);
});

test("cross-essay memory can never become a criticism", () => {
  assert.match(CORE, /They are not requirements for the draft in front of you/);
  for (const verb of ["drops", "omits", "fails to mention"]) {
    assert.ok(CORE.includes(verb), verb);
  }
  assert.match(CORE, /never name an activity, field or achievement that is not in this draft/);
  // Duplication is judged from contents, never from titles.
  assert.match(CORE, /only from their actual contents, never from their titles/);
  assert.match(CORE, /Anything a student marked private stays out of every later question/);
});

test("the hard rules survive in every mode", () => {
  // These are the ones whose breach damages the student rather than the essay,
  // so they live in the core and reach the conversation too.
  for (const mode of [MODE_A, flat(MODE_B_SYSTEM), flat(MODE_B_ASK_SYSTEM)]) {
    assert.match(mode, /Never write the essay/);
    assert.match(mode, /Never invent anything about the student's life/);
    assert.match(mode, /Quote verbatim/);
    assert.match(mode, /Accept a refusal/);
    assert.match(mode, /Never promise or predict admission/);
    assert.match(mode, /Judge the draft, never the demographic/);
    assert.match(mode, /Do not diagnose AI authorship/);
    assert.match(mode, /Do not certify facts from memory/);
  }
});

test("form is never owed, and that reaches all three modes", () => {
  for (const mode of [MODE_A, flat(MODE_B_SYSTEM), flat(MODE_B_ASK_SYSTEM)]) {
    assert.match(mode, /Do not demand a scene, a hook, a metaphor, a disclosed hardship, a public impact, a settled career, or a forward-looking ending/);
    assert.match(mode, /Showing and telling both work/);
    assert.match(mode, /An ordinary teenage voice is a voice/);
    assert.match(mode, /prestige, expense, scale, travel and unusual hardship establish nothing about quality/);
  }
});

test("published essays are possibilities, not thresholds", () => {
  assert.match(CORE, /They are not a threshold, not proof that an essay caused an admission/);
  assert.match(CORE, /not evidence that an older essay could not work now/);
});

test("honesty runs in both directions", () => {
  assert.match(CORE, /Flattery is not kindness here/);
  assert.match(CORE, /When a draft is working, say so and stop/);
  assert.match(CORE, /editing away something that was already good/);
});

test("a first detail does not automatically end a Socratic thread", () => {
  assert.match(CORE, /a first concrete detail does not automatically close a card/);
  assert.match(CORE, /does not stay open to make the exchange feel deep/);
  assert.match(CORE, /enough true material to revise with/);
});

test("the diagnosis stays revisable in conversation", () => {
  assert.match(CORE, /Treat your own diagnosis as revisable/);
  assert.match(CORE, /say so and drop it/);
  assert.match(CORE, /Do not defend a finding into the ground/);
  // Do not imply a reread that did not happen.
  assert.match(CORE, /rather than implying you reread anything/);
});

test("readiness is about the draft in hand, not about perfection", () => {
  assert.match(CORE, /no substantial problem remains in the draft and the context you were given/);
  assert.match(CORE, /never means the student has nothing left in them/);
});

test("a closing reply cannot leave a question hanging", () => {
  assert.ok(MODE_B_SYSTEM.includes("resolved"));
  assert.match(flat(MODE_B_SYSTEM), /question/);
});

test("the question mode still refuses to write the essay", () => {
  assert.match(flat(MODE_B_ASK_SYSTEM), /Never write the essay/);
});

test("asking is not answering, and must not be judged as one", () => {
  const ask = flat(MODE_B_ASK_SYSTEM);
  assert.match(ask, /Do not treat their message as an answer to the flagged spot/);
  assert.match(ask, /do not push them back to the queue until you have actually helped/);
  // A student who asks how to phrase something gets method, never prose.
  assert.match(ask, /say plainly that you won't write it/);
  assert.match(ask, /Method, not content/);
  // It is a plain reply: none of the serialization envelopes belong here.
  assert.ok(!MODE_B_ASK_SYSTEM.includes("<<<CARD>>>"));
  assert.ok(!MODE_B_ASK_SYSTEM.includes("<<<SECTION"));
  assert.match(ask, /No JSON, no headings, no markdown structure/);
});

test("coverage retains independent losses without turning curiosity into homework", () => {
  assert.match(MODE_A, /A candidate is a hypothesis, not a debt/);
  assert.match(MODE_A, /Keep independent losses even when they share a cause/);
  assert.match(MODE_A, /Never silently lose a candidate/);
});

test("the word budget raises the bar for a card on a short answer", () => {
  // Measured on the fifty-word "what brings you joy" case, which asks for zero
  // cards: the rewrite flagged it in three runs out of three, where its
  // predecessor managed one clean run. The coverage spine was outweighing the
  // brevity clause, which sat far away in the supplemental section — the same
  // shape of failure as restraint outweighing coverage before it.
  assert.match(GUIDE, /The word budget is part of this test, not a footnote to it/);
  assert.match(GUIDE, /Fifty words do not hold a scene, its aftermath and a reflection on both/);
  assert.match(GUIDE, /As the budget falls the bar rises/);
  assert.match(GUIDE, /"Reads as a summary rather than an experience" is not that/);
  assert.match(GUIDE, /is finished, not thin/);
  assert.match(GUIDE, /the correct number of cards on it is usually zero/);
  // The coverage argument is scoped so it cannot be read as licence on a
  // fifty-word answer.
  assert.match(GUIDE, /The argument below is about a full-length draft/);
});

test("a concrete last sentence is not a generic closing claim", () => {
  // Measured three runs out of three on the fifty-word joy answer: the read
  // flagged "He keeps choosing longer songs" as a generic closing claim and
  // asked the ending to become a reflection — the one thing that case forbids.
  // The lens was being applied by position rather than by breadth.
  assert.match(GUIDE, /The test is breadth, not position/);
  assert.match(GUIDE, /is not a generic closing claim, however plainly it sits there/);
  assert.match(GUIDE, /asking for the ending they chose not to write/);
  assert.match(GUIDE, /An essay is allowed to stop/);
});

test("a dropped candidate is one that produced no card", () => {
  // The coverage case emitted five candidates, five cards, and five DROPPED
  // lines reading "covered by card N". Harmless to the student, but it makes
  // the scan counts in the logs report drops that never happened.
  assert.match(MODE_A, /A DROPPED line means that candidate produced NO card/);
  assert.match(MODE_A, /"covered by card 3" is not a drop, it is a card/);
});

test("the whole essay is judged before any paragraph is swept", () => {
  // Ten cards on a 649-word draft, one per paragraph in order, was the read
  // walking the essay rather than reading it. The scan was defined as one line
  // per paragraph, so a finding belonging to the whole draft — two halves
  // about different people, a through-line asserted rather than built — had
  // nowhere to be written down and was never made.
  assert.match(GUIDE, /Read the whole thing first, and say what it is doing/);
  assert.match(GUIDE, /it belongs to no single paragraph, which is why it has to be made here or not at all/);
  assert.match(GUIDE, /report ten local gaps in an essay whose actual problem is that its two halves are about different people/);
  // The sweep is second, and subordinate.
  assert.match(GUIDE, /Then sweep the paragraphs/);
  assert.match(GUIDE, /no number of them adds up to the judgement in step 1/);
  assert.match(GUIDE, /an essay does not have a problem in every paragraph merely because you looked at every paragraph/);
  // And it is recorded, so the count can be checked against the cards.
  assert.match(MODE_A, /THROUGH-LINE: /);
});

test("the guide shows one read worked through, not only rules about reading", () => {
  // The prompt is 37k characters of rules and the engine still had to be told
  // four separate times not to sweep paragraphs. Rules describe judgement; an
  // example demonstrates it, and demonstrates the three things the rules kept
  // failing to enforce — a whole-essay judgement first, a drop backed by a
  // quote, and silence over passages that work.
  assert.match(GUIDE, /One read, worked through/);
  assert.match(GUIDE, /Rules describe judgement; this shows it/);
  assert.match(GUIDE, /Where the two disagree, follow this/);
  // The scan in the example opens on the whole draft.
  // Lines inside the quoted block keep their "> " markers once whitespace is
  // collapsed, so match within a line rather than across the wrap.
  assert.match(GUIDE, /THROUGH-LINE: A person who learned that an instrument they relied on was/);
  assert.match(GUIDE, /The music earns it/);
  // The drop cites the draft's own words rather than asserting intent.
  assert.match(GUIDE, /"I learned the piece around its error" is the evidence/);
  assert.match(GUIDE, /"The essay handles this deliberately" would not have been/);
  // Restraint is shown, not just asserted: a one-gap draft draws one card.
  assert.match(GUIDE, /A draft with one real gap gets one card/);
  assert.match(GUIDE, /three more cards here would bury the one that matters/);
  // And the question asks for something that happened.
  assert.match(GUIDE, /The question fits this claim/);
});
