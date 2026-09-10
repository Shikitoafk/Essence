import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findProseOnlyDiagnoses,
  findUncardedCandidates,
} from "./coverageGaps";

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

const LONG = `The carpet blurred beneath me. I was spinning like the ninja in the show. Nothing came, and my brother laughed from the doorway.
Something did break. I woke with a fever and the room pulled sideways. By morning it was just a fever.
A few months ago my supervisor gave me two days to screen 347 articles. I did not bring up the pattern I had noticed.`;

test("a candidate with no card in its paragraph is reported", () => {
  // Measured: a read raised nine candidates, dropped none by hand and emitted
  // three cards. Six findings vanished between the scan and the report.
  const uncarded = findUncardedCandidates(
    LONG,
    [
      "The carpet blurred beneath me — the false rule is never connected to anything",
      "Something did break — the fever turns symbolic with no bridge",
      "A few months ago my supervisor — the silence is never explained",
    ],
    [],
    ["I woke with a fever and the room pulled sideways."],
  );

  assert.equal(uncarded.length, 2);
  assert.match(uncarded[0].line, /false rule/);
  assert.match(uncarded[0].paragraph, /spinning like the ninja/);
  assert.match(uncarded[1].paragraph, /347 articles/);
});

test("a card anywhere in the paragraph counts as covering it", () => {
  // The card quotes one sentence and the scan line names another in the same
  // paragraph. Matching more tightly than the paragraph would report a hit as
  // a miss and send the recovery pass after a gap that is already carded.
  const uncarded = findUncardedCandidates(
    LONG,
    ["Something did break — the fever turns symbolic with no bridge"],
    [],
    ["By morning it was just a fever."],
  );

  assert.deepEqual(uncarded, []);
});

test("two scan lines pointing into one paragraph are one recovery", () => {
  const uncarded = findUncardedCandidates(
    LONG,
    [
      "The carpet blurred beneath me — the false rule goes nowhere",
      "Nothing came, and my brother laughed — the brother never returns",
    ],
    [],
    [],
  );

  assert.equal(uncarded.length, 1);
});

test("a scan line that quotes nothing in the draft is left alone", () => {
  // The model paraphrasing its own candidate is not a finding to recover; it
  // is a line this check cannot place, and guessing would invent one.
  const uncarded = findUncardedCandidates(
    LONG,
    ["Paragraph four — something about a laboratory in another essay"],
    [],
    [],
  );

  assert.deepEqual(uncarded, []);
});

test("a candidate the read dropped by hand is not recovered", () => {
  // Measured on a real draft: a run listed two passages as candidates, dropped
  // both with a reason, and the recovery pass carded both anyway — handing the
  // student the two findings that read had judged and rejected.
  const uncarded = findUncardedCandidates(
    LONG,
    ["Something did break — the fever turns symbolic with no bridge"],
    ["Something did break — the draft already accounts for this"],
    [],
  );

  assert.deepEqual(uncarded, []);
});
