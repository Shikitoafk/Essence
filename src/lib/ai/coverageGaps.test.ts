import assert from "node:assert/strict";
import { test } from "node:test";
import { findProseOnlyDiagnoses } from "./coverageGaps";

const DRAFT = `I spent that summer cataloguing beetles in my grandfather's garage.
The work taught me patience, and I became someone who finishes what he starts.
By August the drawers were full, and I had stopped counting.

What I learned is that persistence matters more than talent.`;

test("a passage criticised in prose with no card is reported", () => {
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [
      {
        section: "checklist findings",
        text: `- **Point 18 — no "so what".** "By August the drawers were full, and I had stopped counting" closes the scene without telling us what it cost.`,
      },
    ],
    ["What I learned is that persistence matters more than talent."],
  );

  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].section, "checklist findings");
  assert.match(gaps[0].quote, /drawers were full/);
});

test("rubric shorthand is not mistaken for a quote from the draft", () => {
  // `"so what"` is under the length floor and is not in the draft either;
  // either guard alone should be enough, and both have to hold.
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [{ section: "checklist findings", text: `- Point 18 — no "so what".` }],
    [],
  );

  assert.deepEqual(gaps, []);
});

test("a prose quote the cards already anchor is not a gap", () => {
  // The prose quotes a fragment; the card quotes the whole sentence. Same
  // passage, so the student can work on it — that is what the check is for.
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [
      {
        section: "checklist findings",
        text: `"persistence matters more than talent" is asserted rather than shown.`,
      },
    ],
    ["What I learned is that persistence matters more than talent."],
  );

  assert.deepEqual(gaps, []);
});

test("a line the model invented is not reported as a coverage gap", () => {
  // Nothing in the draft says this. It is a fabrication, which is a different
  // failure with a different fix — this check must not claim it as a missing
  // card.
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [
      {
        section: "overall impression",
        text: `"My father drove me to the museum every Saturday" does a lot of work here.`,
      },
    ],
    [],
  );

  assert.deepEqual(gaps, []);
});

test("the same passage quoted in two sections is reported once", () => {
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [
      {
        section: "overall impression",
        text: `"By August the drawers were full, and I had stopped counting" is the turn.`,
      },
      {
        section: "framework findings",
        text: `**Matryoshka:** "By August the drawers were full" is the outer doll only.`,
      },
    ],
    [],
  );

  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].section, "overall impression");
});

test("curly quotes are read the same as straight ones", () => {
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [
      {
        section: "overall impression",
        text: `“By August the drawers were full, and I had stopped counting” goes unexamined.`,
      },
    ],
    [],
  );

  assert.equal(gaps.length, 1);
});

test("a card whose quote is not in the draft anchors nothing", () => {
  // The route drops such a card before it reaches the student, so it must not
  // count as coverage here either.
  const gaps = findProseOnlyDiagnoses(
    DRAFT,
    [
      {
        section: "checklist findings",
        text: `"By August the drawers were full, and I had stopped counting" is unexamined.`,
      },
    ],
    ["A sentence that appears nowhere in this draft at all."],
  );

  assert.equal(gaps.length, 1);
});
