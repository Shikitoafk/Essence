import assert from "node:assert/strict";
import { test } from "node:test";
import { applyQuestionPolicy } from "./questionPolicy";

test("a replaceable portrait asks for intent and selection before new detail", () => {
  assert.equal(
    applyQuestionPolicy(
      "Replaceable portrait",
      "What specific disagreement did you resolve during rehearsal?",
    ),
    "What do you most want the reader to understand about you here, and which existing part of the draft comes closest to showing it?",
  );
});

test("a generic closing claim tests deletion before asking for proof", () => {
  assert.equal(
    applyQuestionPolicy(
      "Generic closing claim",
      "Where else did you put this philosophy into action?",
    ),
    "If you removed this broad closing claim, what meaning—if any—would the essay actually lose?",
  );
});

test("other diagnoses retain their draft-specific question", () => {
  assert.equal(
    applyQuestionPolicy("Reader trust", "  Which number can you verify?  "),
    "Which number can you verify?",
  );
});
