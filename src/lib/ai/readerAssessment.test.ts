import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anchorReaderAssessment, formatReaderAssessment, hasReaderAssessment,
  parseReaderAssessment, canReuseReaderAssessment, type ReaderAssessment,
} from "./readerAssessment";
import { parseModeAReport } from "./parseReport";
import type { ParsedSpot } from "../types";

const draft = "My mother wants the stitches hidden. My brother calls each repair a badge. The same neat seam cannot be right for both.";
const reading: ReaderAssessment = {
  person: "You are learning to ask what someone wants a repair to preserve.",
  idea: "Repair becomes a question of the other person's preferences.",
  idea_quote: "The same neat seam cannot be right for both.",
  idea_effect: "The contrast makes the interpretation specific rather than a claim about resilience.",
  voice: "Your plain observations carry a habit of comparing competing definitions of a good result.",
  voice_quote: "My brother calls each repair a badge.",
  voice_effect: "You notice the brother's pride in visible damage; there is no need for a dramatic scene.",
  priority_action: "keep",
  priority: "Protect the differing preferences instead of turning the ending into a general lesson.",
  priority_quote: "",
};
const block = (fields: ReaderAssessment) => `<<<READING>>>\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join("\n")}\n<<<ENDREADING>>>`;

test("a working plain-voiced draft can have a complete assessment and zero cards", () => {
  const report = parseModeAReport(`<<<SECTION:1>>>\n${block(reading)}\n<<<SECTION:4>>>\n<<<END>>>`);
  assert.deepEqual(report.reader_assessment, reading);
  assert.deepEqual(report.spots, []);
  assert.ok(anchorReaderAssessment(report.reader_assessment, draft, []));
  assert.match(report.overall_impression, /### Idea/);
  assert.match(report.overall_impression, /### Voice/);
  assert.doesNotMatch(report.overall_impression, /<<<|priority_action:/);
});

test("a complete reading survives a lost bracket, but not a missing terminator", () => {
  assert.deepEqual(parseReaderAssessment(block(reading).replace("<<<ENDREADING>>>","<<<ENDREADING>")),reading);
  assert.equal(parseReaderAssessment(block(reading).replace("<<<ENDREADING>>>","")),null);
});

test("old reports remain readable but cannot satisfy the new reading contract", () => {
  const report = parseModeAReport("<<<SECTION:1>>>\nAn older saved impression.\n<<<END>>>");
  assert.equal(report.overall_impression, "An older saved impression.");
  assert.equal(report.reader_assessment, null);
  assert.equal(hasReaderAssessment(report.overall_impression), false);
  assert.equal(hasReaderAssessment(formatReaderAssessment(reading)), true);
});

test("an empty voice judgment is incomplete even if the report ends normally", () => {
  const report = parseModeAReport(`<<<SECTION:1>>>\n${block({ ...reading, voice: "" })}\n<<<END>>>`);
  assert.equal(report.reader_assessment, null);
  assert.doesNotMatch(report.overall_impression, /<<<READING/);
  assert.equal(anchorReaderAssessment(report.reader_assessment, draft, []), null);
});

test("invented evidence does not ground a favorable idea judgment", () => {
  assert.equal(anchorReaderAssessment({ ...reading, idea_quote: "I became a resilient leader." }, draft, []), null);
  assert.equal(anchorReaderAssessment({ ...reading, voice_quote: "I became a resilient leader." }, draft, []), null);
});

test("quote anchoring normalizes punctuation and keeps the student's actual wording", () => {
  const actual = draft.replace("brother calls", "brother\n calls");
  const anchored = anchorReaderAssessment(reading, actual, []);
  assert.ok(anchored);
  assert.equal(anchored.voice_quote, "My brother\n calls each repair a badge.");
});

test("a conceptual revision cannot vanish into prose while an empty card list looks finished", () => {
  const revision = { ...reading, priority_action: "revise" as const, priority_quote: reading.idea_quote };
  assert.equal(anchorReaderAssessment(revision, draft, []), null);
  const spot = { quoted_text: reading.idea_quote, impact: "structural" } as ParsedSpot;
  assert.ok(anchorReaderAssessment(revision, draft, [spot]));
  assert.equal(anchorReaderAssessment(revision, draft, [{ ...spot, impact: "polish" }]), null);
  assert.equal(anchorReaderAssessment(revision, draft, [{ ...spot, quoted_text: reading.voice_quote }]), null);
});

test("a priority may share a longer card anchor, but not a fabricated one", () => {
  const revision = { ...reading, priority_action: "revise" as const, priority_quote: "same neat seam" };
  assert.ok(anchorReaderAssessment(revision, draft, [{ quoted_text: reading.idea_quote, impact: "substantive" } as ParsedSpot]));
  assert.equal(anchorReaderAssessment({ ...revision, priority_quote: "An imaginary flaw." }, draft, []), null);
});

test("a keep judgment cannot contradict a substantive correction on the same read", () => {
  assert.equal(anchorReaderAssessment(reading, draft, [{ quoted_text: reading.idea_quote, impact: "substantive" } as ParsedSpot]), null);
  assert.ok(anchorReaderAssessment(reading, draft, [{ quoted_text: reading.idea_quote, impact: "polish" } as ParsedSpot]));
});

test("multiline source evidence stays in blockquotes when displayed", () => {
  assert.match(formatReaderAssessment({ ...reading, voice_quote: "My brother\ncalls it a badge." }), /> My brother\n> calls it a badge\./);
});

test("revising requires an anchor and unknown actions are rejected", () => {
  assert.equal(parseReaderAssessment(block({ ...reading, priority_action: "revise" })), null);
  assert.equal(parseReaderAssessment(block(reading).replace("priority_action: keep", "priority_action: excellent")), null);
});

test("wrapped assessment prose survives parsing without leaking its field names", () => {
  const parsed = parseReaderAssessment(block(reading).replace("idea: Repair becomes", "idea: Repair\nbecomes"));
  assert.equal(parsed?.idea, reading.idea);
});

test("reuse requires both the report's exact snapshot and the complete reading format", () => {
  const assessment = formatReaderAssessment(reading);
  assert.equal(canReuseReaderAssessment(draft, draft, assessment), true);
  assert.equal(canReuseReaderAssessment(draft + " Changed ending.", draft, assessment), false);
  assert.equal(canReuseReaderAssessment(draft, null, assessment), false);
  assert.equal(canReuseReaderAssessment(draft, draft, "An old general impression."), false);
});
