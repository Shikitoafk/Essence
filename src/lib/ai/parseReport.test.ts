import assert from "node:assert/strict";
import { test } from "node:test";
import { locateQuote, parseModeAReport } from "./parseReport";

const DRAFT = `I spent that summer cataloguing beetles in my grandfather's garage.
The work taught me patience, and I became someone who finishes what he starts.
By August the drawers were full, and I had stopped counting.

What I learned is that persistence matters more than talent.`;

const REPORT = `<<<SECTION:1>>>
A Narrative essay with a real setting and a genuine ear for detail. The central
problem lands mid-essay, which works here because the garage is established first.

<<<SECTION:2>>>
- **Point 3 — Excessive abstraction.** "persistence matters more than talent" is
  asserted rather than shown.
- **Point 18 — no "so what".**

<<<SECTION:3>>>
**Matryoshka:** the outer doll is vivid, the inner doll is still generic.

<<<SECTION:4>>>
<<<CARD>>>
pattern: Underdeveloped change
confidence: high
quote: The work taught me patience, and I became someone who finishes what he starts.
clear: You stayed with a long, repetitive task for a whole summer.
unexplored: No moment where finishing something actually looked different.
matters: This is the essay's central claim about you, and it is only asserted.
question: What was the next thing you nearly quit and didn't? That week, that autumn, or much later.
<<<ENDCARD>>>
<<<CARD>>>
pattern: Generic closing claim
confidence: medium
quote: What I learned is that persistence matters more than talent.
clear: You want to end on a lesson.
unexplored: Nothing present-tense or specific grounds it.
matters: The last line is what the reader carries out, and right now anyone could have written it.
question: What is something you are still doing every week because of that summer?
<<<ENDCARD>>>

<<<SECTION:5>>>
1. Replace the closing claim with a present-tense fact.
2. Show one instance of finishing something.
3. Cut the August sentence if it does no work.

<<<SECTION:6>>>
### For a 10-year-old
- You picked one small thing and stuck with it.

### For a 17-year-old applicant
- The garage is concrete and unusual — that's an asset.

### For a Writing PhD
- The montage restraint is deliberate and mostly earned.

<<<SECTION:7>>>
1. [2] What is something you are still doing every week because of that summer?
2. [1] What was the next thing you nearly quit and didn't? That week, that autumn, or much later.
<<<END>>>`;

test("parses every section of a well-formed report", () => {
  const report = parseModeAReport(REPORT);

  assert.match(report.overall_impression, /Narrative essay/);
  assert.match(report.checklist_findings, /Point 3/);
  assert.match(report.framework_findings, /Matryoshka/);
  assert.match(report.priorities, /present-tense fact/);
  assert.match(report.strengths, /For a Writing PhD/);
  // Section markers must not bleed into the stored prose.
  assert.doesNotMatch(report.overall_impression, /<<</);
});

test("parses both spot cards with all fields", () => {
  const { spots } = parseModeAReport(REPORT);

  assert.equal(spots.length, 2);
  assert.equal(spots[0].pattern_name, "Underdeveloped change");
  assert.equal(spots[0].confidence, "high");
  assert.equal(spots[1].pattern_name, "Generic closing claim");
  assert.equal(spots[1].confidence, "medium");
  assert.match(spots[0].what_is_clear, /repetitive task/);
  assert.match(spots[0].question, /nearly quit/);
});

test("honours the queue order from section 7", () => {
  const { queue, spots } = parseModeAReport(REPORT);

  // Section 7 puts card 2 first, so the closing claim is asked about first.
  assert.deepEqual(queue, [1, 0]);
  assert.equal(spots[queue[0]].pattern_name, "Generic closing claim");
});

test("appends cards the queue forgot rather than dropping them", () => {
  const withShortQueue = REPORT.replace(
    /1\. \[2\][^\n]*\n2\. \[1\][^\n]*/,
    "1. [2] Only one question listed.",
  );
  const { queue } = parseModeAReport(withShortQueue);
  assert.deepEqual(queue, [1, 0]);
});

test("drops a card that has no quote or no question", () => {
  const broken = `<<<SECTION:4>>>
<<<CARD>>>
pattern: Reflection gap
confidence: low
clear: Something.
unexplored: Something else.
matters: It matters.
question: A question with no quote above it.
<<<ENDCARD>>>
<<<END>>>`;
  assert.equal(parseModeAReport(broken).spots.length, 0);
});

test("survives a model that skips the markers entirely", () => {
  const report = parseModeAReport("Just some prose with no contract at all.");
  assert.equal(report.spots.length, 0);
  assert.deepEqual(report.queue, []);
  assert.equal(report.overall_impression, "");
});

test("strips quotation marks the model adds around a quote", () => {
  const quoted = REPORT.replace(
    "quote: The work taught me patience",
    'quote: "The work taught me patience',
  ).replace("finishes what he starts.\nclear:", 'finishes what he starts."\nclear:');
  const { spots } = parseModeAReport(quoted);
  assert.ok(spots[0].quoted_text.startsWith("The work taught me"));
  assert.ok(!spots[0].quoted_text.includes('"'));
});

test("locateQuote finds an exact quote", () => {
  const hit = locateQuote(DRAFT, "By August the drawers were full");
  assert.ok(hit);
  assert.equal(DRAFT.slice(hit.start, hit.end), "By August the drawers were full");
});

test("locateQuote tolerates smart quotes and dashes", () => {
  const hit = locateQuote(DRAFT, "in my grandfather’s garage");
  assert.ok(hit);
  assert.equal(hit.text, "in my grandfather's garage");
});

test("locateQuote tolerates collapsed whitespace and a line break", () => {
  const hit = locateQuote(
    DRAFT,
    "beetles in my grandfather's garage. The work taught me patience",
  );
  assert.ok(hit);
  // The draft has a newline where the quote has a single space.
  assert.ok(hit.text.includes("\n"));
});

test("locateQuote returns null for text the model invented", () => {
  assert.equal(locateQuote(DRAFT, "I never wrote this sentence anywhere"), null);
});

test("every parsed quote from the sample report anchors in the draft", () => {
  const { spots } = parseModeAReport(REPORT);
  for (const spot of spots) {
    assert.ok(
      locateQuote(DRAFT, spot.quoted_text),
      `quote should anchor: ${spot.quoted_text}`,
    );
  }
});
