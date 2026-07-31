import assert from "node:assert/strict";
import { test } from "node:test";
import { draftSimilarity, isNearIdentical } from "./similarity";
import { deriveMargin, COMPARISON_AXES, type AxisScore } from "./types";

const WINNER = "winner-id";
const LOSER = "loser-id";

/** Builds a full five-axis result, awarding the named axes to the winner. */
function axes(winnerTakes: string[]): AxisScore[] {
  return COMPARISON_AXES.map((axis) => ({
    axis,
    winner_id: winnerTakes.includes(axis) ? WINNER : LOSER,
    justification: "",
  }));
}

test("a clear win takes all three dominant axes", () => {
  assert.equal(
    deriveMargin(axes(["core_self", "voice", "risk"]), WINNER),
    "clear",
  );
});

test("sweeping every axis is still clear", () => {
  assert.equal(deriveMargin(axes([...COMPARISON_AXES]), WINNER), "clear");
});

test("dropping any dominant axis makes the call narrow", () => {
  for (const dropped of ["core_self", "voice", "risk"]) {
    const taken = ["core_self", "voice", "risk"].filter((a) => a !== dropped);
    assert.equal(
      deriveMargin(axes(taken), WINNER),
      "narrow",
      `losing ${dropped} must read as narrow`,
    );
  }
});

test("winning only the tiebreaker axes is narrow, never clear", () => {
  // Structure and texture cannot carry a verdict on their own — a tidy essay
  // with nobody in it is exactly the case this weighting exists to catch.
  assert.equal(
    deriveMargin(axes(["texture", "structural_soundness"]), WINNER),
    "narrow",
  );
});

test("a missing axis row cannot be read as a clear win", () => {
  const incomplete = axes(["core_self", "voice", "risk"]).filter(
    (a) => a.axis !== "voice",
  );
  assert.equal(deriveMargin(incomplete, WINNER), "narrow");
});

test("identical drafts are near-identical", () => {
  const draft = "The fever lasted a week. I counted the ceiling tiles.";
  assert.equal(draftSimilarity(draft, draft), 1);
  assert.equal(isNearIdentical(draft, draft), true);
});

test("a couple of word edits across a real draft is still the same essay", () => {
  // Length matters: the threshold is calibrated for essays of a few hundred
  // words, where retouching a phrase moves similarity by a fraction of a
  // percent. Testing it on two sentences would say more about the fixture.
  const body = Array.from(
    { length: 40 },
    (_, i) =>
      `In the ${i}th week I logged the readings, labelled the flask, and put it back on the shelf where my grandfather kept his drawers.`,
  ).join(" ");

  const before = `The fever lasted a week. ${body}`;
  const after = `The fever lasted eight days. ${body}`;

  assert.ok(
    draftSimilarity(before, after) > 0.98,
    "a phrase-level edit should barely move similarity",
  );
  assert.equal(isNearIdentical(before, after), true);
});

test("two genuinely different takes are not near-identical", () => {
  const metaphor =
    "Spinjitzu promised that the right sequence of moves would summon fire. I spun in the garage for a year and nothing lit.";
  const stripped =
    "My grandfather kept beetles in labelled drawers. I catalogued them the summer I turned fifteen, and by August the drawers were full.";
  assert.equal(isNearIdentical(metaphor, stripped), false);
  assert.ok(draftSimilarity(metaphor, stripped) < 0.5);
});

test("a rewritten ending is a real difference, not an edit", () => {
  const shared = "I spent that summer cataloguing beetles in the garage. ";
  const a = `${shared}Who weaves the threads? For a long time, they did. Now I want to.`;
  const b = `${shared}I still don't know why my rule didn't produce fire, and I've stopped assuming that not knowing means I did something wrong.`;
  assert.equal(isNearIdentical(a, b), false);
});

test("similarity is symmetric", () => {
  const a = "One version, built around a controlling metaphor about thread.";
  const b = "Another version, the same story with the metaphor stripped out.";
  assert.equal(draftSimilarity(a, b), draftSimilarity(b, a));
});

test("an empty draft is never near-identical to a real one", () => {
  assert.equal(isNearIdentical("", "Some actual essay text here."), false);
});
