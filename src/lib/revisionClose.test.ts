import assert from "node:assert/strict";
import { test } from "node:test";
import { locateQuote } from "./ai/parseReport";

/**
 * A spot sits at `answered` once the student has produced the material, and
 * only becomes `resolved` when the quoted line stops appearing in the draft —
 * i.e. when the passage has actually been rewritten.
 *
 * The whole point is that talking about an essay is not writing one, so these
 * pin the two ways that could go wrong: closing a spot the student never
 * revised, and refusing to close one they did.
 */

const QUOTE = "It made me bolder. I'd rather use the thread than save it.";

const DRAFT_BEFORE = `The fever lasted a week.
${QUOTE}
Three years later I was in a lab.`;

/** Mirrors the promotion rule in Workspace: gone from the draft means revised. */
const isRevised = (draft: string, quote: string) => !locateQuote(draft, quote);

test("an unchanged draft never closes the spot", () => {
  assert.equal(isRevised(DRAFT_BEFORE, QUOTE), false);
});

test("editing elsewhere in the essay does not close the spot", () => {
  // The student worked on a different paragraph; this passage still stands.
  const edited = DRAFT_BEFORE.replace(
    "Three years later I was in a lab.",
    "Three years later I was rebuilding a protocol for the fourth time.",
  );
  assert.equal(isRevised(edited, QUOTE), false);
});

test("rewriting the quoted line closes the spot", () => {
  const revised = DRAFT_BEFORE.replace(
    QUOTE,
    "The next week I signed up for the lab rotation I'd been avoiding since March.",
  );
  assert.equal(isRevised(revised, QUOTE), true);
});

test("deleting the passage closes the spot", () => {
  assert.equal(isRevised(DRAFT_BEFORE.replace(QUOTE, ""), QUOTE), true);
});

test("retyping the line with different punctuation does NOT close it", () => {
  // locateQuote folds smart quotes and dashes, so a cosmetic retype is still
  // the same sentence. Closing here would credit a revision that never
  // happened — the claim is still asserted, not shown.
  const cosmetic = DRAFT_BEFORE.replace(
    QUOTE,
    "It made me bolder. I’d rather use the thread than save it.",
  );
  assert.equal(isRevised(cosmetic, QUOTE), false);
});

test("reflowing the line across two lines does NOT close it", () => {
  const reflowed = DRAFT_BEFORE.replace(
    QUOTE,
    "It made me bolder.\nI'd rather use the thread than save it.",
  );
  assert.equal(isRevised(reflowed, QUOTE), false);
});

test("an emptied draft closes every spot", () => {
  assert.equal(isRevised("", QUOTE), true);
});
