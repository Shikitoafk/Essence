import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIAGNOSTIC_GUIDE,
  ENGINE_CORE,
  MODE_A_SYSTEM,
  MODE_B_ASK_SYSTEM,
  MODE_B_SYSTEM,
} from "./systemPrompt";

/** Hard wraps in the prompt should not make semantic checks fragile. */
const flat = (value: string) => value.replace(/\s+/g, " ");

const CORE = flat(ENGINE_CORE);
const GUIDE = flat(DIAGNOSTIC_GUIDE);
const MODE_A = flat(MODE_A_SYSTEM);
const MODE_B = flat(MODE_B_SYSTEM);
const MODE_B_ASK = flat(MODE_B_ASK_SYSTEM);

test("only the full read receives the diagnostic procedure", () => {
  for (const mode of [MODE_A_SYSTEM, MODE_B_SYSTEM, MODE_B_ASK_SYSTEM]) {
    assert.ok(mode.includes(ENGINE_CORE));
  }
  assert.ok(MODE_A_SYSTEM.includes(DIAGNOSTIC_GUIDE));
  assert.ok(!MODE_B_SYSTEM.includes(DIAGNOSTIC_GUIDE));
  assert.ok(!MODE_B_ASK_SYSTEM.includes(DIAGNOSTIC_GUIDE));
});

test("serialization belongs to mode-specific contracts", () => {
  assert.ok(!ENGINE_CORE.includes("<<<SECTION"));
  assert.ok(!DIAGNOSTIC_GUIDE.includes("<<<CARD>>>"));
  assert.ok(MODE_A_SYSTEM.includes("<<<SCAN>>>"));
  assert.ok(MODE_A_SYSTEM.includes("<<<CARD>>>"));
  assert.ok(MODE_A_SYSTEM.includes("<<<SECTION:9>>>"));
  assert.ok(!MODE_A_SYSTEM.includes('"verdict"'));
  assert.ok(MODE_B_SYSTEM.includes('"verdict"'));
  assert.ok(!MODE_B_SYSTEM.includes("<<<CARD>>>"));
});

test("every mode keeps the non-negotiable protections", () => {
  for (const mode of [MODE_A, MODE_B, MODE_B_ASK]) {
    assert.match(mode, /NEVER WRITE THE ESSAY/);
    assert.match(mode, /NEVER INVENT LIFE MATERIAL/);
    assert.match(mode, /QUOTE VERBATIM/);
    assert.match(mode, /ACCEPT REFUSAL/);
    assert.match(mode, /NEVER PREDICT ADMISSION/);
    assert.match(mode, /JUDGE THE DRAFT, NOT THE DEMOGRAPHIC/);
    assert.match(mode, /DO NOT DIAGNOSE AI AUTHORSHIP/);
    assert.match(mode, /DO NOT CERTIFY EXTERNAL FACTS FROM MEMORY/);
  }
});

test("the prompt judges a person beneath the topic", () => {
  assert.match(CORE, /It does owe a person/);
  assert.match(CORE, /separate TOPIC from SUBJECT/);
  assert.match(CORE, /Do not confuse a topic with a portrait/);
  assert.match(CORE, /The supported human pattern does/);
  assert.match(CORE, /This writer repeatedly encounters something slightly misaligned/);
});

test("voice is read as perception rather than decoration", () => {
  assert.match(CORE, /Voice is also perception/);
  assert.match(CORE, /What does this writer notice that another person/);
  assert.match(CORE, /perceptual voice from decorative cleverness/);
  assert.match(CORE, /Plain observation can carry strong voice/);
  assert.match(GUIDE, /generic interpretation vs particular perception/);
});

test("reader distance permits reflection but catches redundant translation", () => {
  assert.match(CORE, /LOOKING AT the writer/);
  assert.match(CORE, /LOOKING THROUGH the writer/);
  assert.match(CORE, /Direct reflection can be excellent/);
  assert.match(CORE, /explanation repeatedly translates an experience/);
  assert.match(GUIDE, /whether the distance is intentional and useful/);
});

test("facets are tested for integration rather than counted", () => {
  assert.match(CORE, /Do not require multiple dimensions/);
  assert.match(CORE, /One precisely explored facet may be enough/);
  assert.match(CORE, /Could the essay be color-coded into separate trait sections/);
  assert.match(GUIDE, /RUN THE SEAM TEST/);
  assert.match(CORE, /material that has not yet created that relationship/);
});

test("productive contradiction is protected", () => {
  assert.match(CORE, /Real people frequently contain opposing tendencies/);
  assert.match(CORE, /do not flatten them into one trait/);
  assert.match(CORE, /Do not require resolution/);
  assert.match(GUIDE, /Productive contradiction flattened/);
});

test("development does not require a forced transformation", () => {
  assert.match(CORE, /What changed meaning/);
  assert.match(CORE, /Do not force: bad past self/);
  assert.match(CORE, /The writer may remain recognizably the same person/);
  assert.match(GUIDE, /A portrait may deepen without transforming/);
  assert.match(GUIDE, /False before-and-after/);
});

test("reflection is tested for function through explanation debt", () => {
  assert.match(CORE, /Reflection is not automatically good/);
  assert.match(CORE, /If this sentence vanished/);
  assert.match(CORE, /words spent translating the essay back into a thesis/);
  assert.match(GUIDE, /Recommend cutting or reducing only when the explanation adds no new layer/);
});

test("reader residue reconstructs a person without an elite-pool contest", () => {
  assert.match(CORE, /Identify two or three draft-specific handles/);
  assert.match(CORE, /Could those handles reconstruct a particular person/);
  assert.match(CORE, /An unusual number, place, name, or event is not a handle by itself/);
  assert.match(CORE, /Do NOT compare the writer with an imagined elite applicant pool/);
});

test("form remains optional in all modes", () => {
  for (const mode of [MODE_A, MODE_B, MODE_B_ASK]) {
    assert.match(mode, /FORM IS NOT OWED/);
    assert.match(mode, /Do not demand: a scene, a hook, a metaphor/);
    assert.match(mode, /Showing and telling both work/);
    assert.match(mode, /An ordinary teenage voice is a voice/);
  }
});

test("the whole draft is read before local diagnosis", () => {
  assert.match(GUIDE, /READ THE WHOLE ESSAY BEFORE DIAGNOSING LINES/);
  assert.match(GUIDE, /Do not begin with the opening paragraph/);
  assert.match(GUIDE, /Only after the whole-draft read, sweep/);
  assert.match(GUIDE, /A candidate costs nothing at this stage/);
  assert.match(MODE_A, /One line per GAP, not per paragraph/);
});

test("through-line failures dominate local sentence requests", () => {
  assert.match(GUIDE, /For each major episode, determine what it contributes/);
  assert.match(GUIDE, /When the through-line breaks, that is a whole-draft finding/);
  assert.match(GUIDE, /do not manufacture a structural problem/);
  assert.match(GUIDE, /Do not interrogate material likely to be cut/);
});

test("a finding must prove a specific cost", () => {
  assert.match(GUIDE, /A finding qualifies only when you can state all three/);
  assert.match(GUIDE, /What that loss costs THIS essay/);
  assert.match(GUIDE, /you do not yet have a finding/);
  assert.match(GUIDE, /Drop it/);
});

test("lenses are possibilities rather than a checklist", () => {
  assert.match(GUIDE, /These are lenses, not requirements/);
  assert.match(GUIDE, /Silence when no problem exists/);
  for (const lens of [
    "Replaceable portrait",
    "Perception missing",
    "Procedure without judgment",
    "Other people without agency",
    "Mechanical motif",
    "Borrowed voice",
    "Reader trust",
    "Prompt mismatch",
  ]) {
    assert.ok(DIAGNOSTIC_GUIDE.includes(lens), lens);
  }
});

test("candidate decisions precede questions and respect the word budget", () => {
  assert.match(GUIDE, /Choose the needed repair BEFORE writing the question/);
  assert.match(GUIDE, /Group candidates that require the same underlying decision/);
  assert.match(GUIDE, /Do not interrogate material likely to be cut/);
  assert.match(GUIDE, /Every requested addition must justify the space it consumes/);
  assert.match(GUIDE, /Short responses especially should not be punished/);
});

test("impact and confidence are calibrated without gaming readiness", () => {
  for (const impact of ["STRUCTURAL", "SUBSTANTIVE", "POLISH"]) {
    assert.ok(DIAGNOSTIC_GUIDE.includes(impact), impact);
  }
  for (const confidence of ["HIGH", "MEDIUM", "LOW"]) {
    assert.ok(DIAGNOSTIC_GUIDE.includes(confidence), confidence);
  }
  assert.match(GUIDE, /Do not inflate taste into substance/);
  assert.match(GUIDE, /A draft with only polish findings is functionally ready/);
  assert.match(GUIDE, /Confidence concerns the diagnosis, never admission chances/);
});

test("questions seek the missing unit rather than automatic detail", () => {
  assert.match(GUIDE, /The question must follow from the diagnosed loss/);
  assert.match(GUIDE, /Do not ask for: more emotion, more detail, more vulnerability/);
  assert.match(GUIDE, /unless that is the specific missing unit/);
  assert.match(GUIDE, /helps the student make a decision/);
  assert.match(MODE_A, /Ask for an event only when this card proved that an event is the missing unit/);
});

test("strengths protect effects instead of padding the report", () => {
  assert.match(GUIDE, /Strengths are not consolation/);
  assert.match(GUIDE, /what NOT to destroy/);
  assert.match(GUIDE, /A strength must describe an effect and its cause/);
  assert.match(MODE_A, /No quota, no three-level retelling, no consolation praise/);
});

test("supplementals are judged against the supplied task", () => {
  assert.match(GUIDE, /Classify the actual task silently/);
  assert.match(GUIDE, /Why Us/);
  assert.match(GUIDE, /Community \/ belonging/);
  assert.match(GUIDE, /Short answer/);
  assert.match(GUIDE, /If the prompt was not supplied, do not claim prompt mismatch/);
});

test("the final discipline checks person, subject, voice, seams, and trust", () => {
  for (const check of ["PERSON", "SUBJECT", "VOICE", "SEAMS", "TRUST"]) {
    assert.ok(DIAGNOSTIC_GUIDE.includes(`${check}\n`), check);
  }
  assert.match(GUIDE, /Only supported losses become cards/);
  assert.match(GUIDE, /A finished essay is allowed to remain finished/);
});

test("the report reconciles the scan, cards, and prose diagnoses", () => {
  assert.match(MODE_A, /The count follows the draft; there is no normal or preferred number/);
  assert.match(MODE_A, /A DROPPED line means that candidate produced NO card/);
  assert.match(MODE_A, /a candidate that is neither carded nor listed as DROPPED is a finding you lost/);
  assert.match(MODE_A, /Anything you diagnose in sections 1, 2, 3 or 8/);
  assert.match(MODE_A, /must also exist as a card in section 4/);
});

test("the card contract exposes the new diagnostic vocabulary", () => {
  for (const pattern of [
    "Topic without subject",
    "Trait sections with visible seams",
    "Explanation debt",
    "Productive contradiction flattened",
    "Generic or overearned ending",
  ]) {
    assert.ok(MODE_A_SYSTEM.includes(pattern), pattern);
  }
  assert.match(MODE_A, /Never force a finding into the wrong pattern/);
});

test("Mode B revises its diagnosis without turning answers into a detail hunt", () => {
  assert.match(CORE, /Treat your own diagnosis as revisable/);
  assert.match(CORE, /Do not defend your finding merely because you generated it/);
  assert.match(CORE, /Do not demand an event when the missing unit is an idea/);
  assert.match(CORE, /Do not repeatedly ask for aftermath/);
  assert.match(MODE_B, /If cutting the claim solves the loss, resolve that decision/);
  assert.match(MODE_B, /Reflection made now must not become a realization or change of behavior back then/);
});

test("Mode B closes resolved turns and question mode remains method-only", () => {
  assert.match(MODE_B, /A "resolved" reply MUST NOT end with a question/);
  assert.match(MODE_B, /needs_narrower/);
  assert.match(MODE_B_ASK, /Do not treat their message as an answer/);
  assert.match(MODE_B_ASK, /Method, not content/);
  assert.match(MODE_B_ASK, /No JSON, no headings, no markdown structure/);
});
