import assert from "node:assert/strict";
import { test } from "node:test";
import { spotKey } from "./types";

const PATTERN = "Underdeveloped change";
const QUOTE = "It made me bolder. I'd rather use the thread than save it.";

test("same pattern on the same line is the same finding", () => {
  assert.equal(spotKey(PATTERN, QUOTE), spotKey(PATTERN, QUOTE));
});

test("ignores the punctuation the model varies between runs", () => {
  // A re-read commonly comes back with curly quotes or an em dash where the
  // previous run had straight ones. Same finding, must not duplicate.
  assert.equal(
    spotKey(PATTERN, "It made me bolder — I'd rather use the thread."),
    spotKey(PATTERN, "It made me bolder - I’d rather use the thread."),
  );
});

test("ignores whitespace and casing differences", () => {
  assert.equal(
    spotKey(PATTERN, "It made me   bolder.\nI'd rather use the thread."),
    spotKey("underdeveloped change", "it made me bolder. I'd rather use the thread."),
  );
});

test("a different pattern on the same line is a different finding", () => {
  // Two patterns can legitimately fire on one line — that is not a duplicate.
  assert.notEqual(spotKey(PATTERN, QUOTE), spotKey("Reflection gap", QUOTE));
});

test("the same pattern on a different line is a different finding", () => {
  assert.notEqual(
    spotKey(PATTERN, QUOTE),
    spotKey(PATTERN, "Who weaves the threads? For a long time, they did."),
  );
});

test("confidence is not part of identity", () => {
  // The reported duplicates included the same pattern and line at high and at
  // medium confidence. Those are one finding the model rated twice.
  const key = spotKey("Procedural narration", QUOTE);
  assert.equal(key, spotKey("Procedural narration", QUOTE));
});
