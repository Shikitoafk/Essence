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

test("the new ending label receives the same deletion test", () => {
  assert.equal(
    applyQuestionPolicy(
      "Generic or overearned ending",
      "What later experience proves this lesson?",
    ),
    "If you removed this broad closing claim, what meaning—if any—would the essay actually lose?",
  );
});

test("explanation debt asks whether the explanation earns its space", () => {
  assert.equal(
    applyQuestionPolicy("Explanation debt", "Can you make this more vivid?"),
    "If you removed this explanation, what understanding—if any—would the preceding material no longer carry on its own?",
  );
});

test("visible seams force selection before collecting more stories", () => {
  assert.equal(
    applyQuestionPolicy(
      "Trait sections with visible seams",
      "What specific moment could connect all four activities?",
    ),
    "Which existing part of the draft carries the person you most want the reader to meet, and what would actually be lost by cutting the rest?",
  );
});

test("motifs and decorative details are tested by deletion", () => {
  assert.match(
    applyQuestionPolicy("Mechanical motif", "What does the image symbolize?"),
    /callback disappeared/,
  );
  assert.match(
    applyQuestionPolicy("Decorative detail", "How did this make you feel?"),
    /removed this detail/,
  );
});

test("other diagnoses retain their draft-specific question", () => {
  assert.equal(
    applyQuestionPolicy("Reader trust", "  Which number can you verify?  "),
    "Which number can you verify?",
  );
});
