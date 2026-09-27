import assert from "node:assert/strict";
import { test } from "node:test";
import { applyQuestionPolicy } from "./questionPolicy";
import { questionShapeIssues } from "./questionShape";

test("a replaceable portrait asks for intent and selection before new detail", () => {
  assert.equal(
    applyQuestionPolicy(
      "Replaceable portrait",
      "What specific disagreement did you resolve during rehearsal?",
    ),
    "Which existing part of the draft comes closest to showing the person you want the reader to understand?",
  );
  assert.doesNotMatch(
    applyQuestionPolicy("Replaceable portrait", "Give me another scene?"),
    /,\s*and\b|\bor\b/i,
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
    "Which existing part of the draft carries the person you most want the reader to meet?",
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

test("removes empty specificity language without replacing a sound question", () => {
  assert.equal(
    applyQuestionPolicy(
      "Reader trust",
      "  Which specific number in the report can you verify?  ",
    ),
    "Which number in the report can you verify?",
  );
});

test("replaces menus and compound prompts with one pattern-safe decision", () => {
  const topic = applyQuestionPolicy(
    "Topic without subject",
    "Which specific moment from the lab, competition, or classroom reveals you, and what did it change?",
  );
  assert.equal(
    topic,
    "What do you want this material to reveal about you that its topic alone cannot?",
  );
  assert.equal((topic.match(/\?/g) ?? []).length, 1);
  assert.doesNotMatch(topic, /,[^,?]*\bor\b/i);
});

test("replaces a presupposed causal link instead of making the student confirm it", () => {
  assert.equal(
    applyQuestionPolicy(
      "False before-and-after",
      "How did that failure change the way you approached every later project?",
    ),
    "What made your earlier position reasonable to you at the time?",
  );
});

test("turns common detail requests into editorial decisions", () => {
  assert.equal(
    applyQuestionPolicy(
      "Underdeveloped change",
      "What is another situation where this lesson changed what you did?",
    ),
    "What in the existing draft shows that this change lasted beyond the moment?",
  );
  assert.equal(
    applyQuestionPolicy(
      "Procedural narration",
      "What failed in the robot, and what did you change next?",
    ),
    "Where in this process did you make a judgment of your own?",
  );
  assert.equal(
    applyQuestionPolicy(
      "Reflection gap",
      "What did you see or hear in the auditorium?",
    ),
    "What do you understand here that the sequence of events alone does not show?",
  );
});

test("selection and deletion come before connecting unrelated episodes", () => {
  assert.equal(
    applyQuestionPolicy(
      "Episodes that repeat one facet",
      "Which scene should you expand, and what happened there?",
    ),
    "Which existing episode reveals something about you that the others do not?",
  );
  assert.equal(
    applyQuestionPolicy(
      "Disconnected episodes",
      "How do the race and chemistry connect to the map?",
    ),
    "What would the essay lose if this later material were removed?",
  );
});

test("leaves an unknown pattern intact rather than applying a generic fallback", () => {
  assert.equal(
    applyQuestionPolicy(
      "Unusual but valid diagnosis",
      "Was it pressure from home, or fear of being wrong?",
    ),
    "Was it pressure from home, or fear of being wrong?",
  );
});

test("an explicit repair protects custom pattern names", () => {
  assert.equal(
    applyQuestionPolicy(
      "A custom name the model invented",
      "What new experience could prove this claim?",
      "cut",
    ),
    "What would the essay lose if this passage were removed?",
  );
  assert.equal(
    applyQuestionPolicy(
      "Another custom name",
      "Which club, class, or competition should become a new scene?",
      "select_existing",
    ),
    "Which existing passage carries the meaning this section is trying to create?",
  );
});

test("ask-missing keeps a clean custom question and repairs a shaped one", () => {
  assert.equal(
    applyQuestionPolicy(
      "Unusual missing unit",
      "What did your teammate decide at that point?",
      "ask_missing",
    ),
    "What did your teammate decide at that point?",
  );
  assert.equal(
    applyQuestionPolicy(
      "Unusual missing unit",
      "Was it fear, pressure, or embarrassment, and what did you do?",
      "ask_missing",
    ),
    "What is the one missing piece the reader needs here?",
  );
});

test("every protected diagnosis produces one unseeded question", () => {
  const protectedPatterns = [
    "Replaceable portrait",
    "Generic closing claim",
    "Generic or overearned ending",
    "Explanation debt",
    "Trait sections with visible seams",
    "Episodes that repeat one facet",
    "Is anyone here",
    "Disconnected episodes",
    "Underdeveloped change",
    "Procedural narration",
    "Procedure without judgment",
    "Reflection gap",
    "Thinking named rather than performed",
    "Change claimed but not supported",
    "False before-and-after",
    "Mechanical motif",
    "Decorative detail",
  ];

  for (const pattern of protectedPatterns) {
    const question = applyQuestionPolicy(
      pattern,
      "Was it pressure from home, or fear of failure, and what did you do? Why?",
    );
    assert.deepEqual(questionShapeIssues(question), [], pattern);
    assert.doesNotMatch(question, /\b(specific|concrete)\b/i, pattern);
    assert.equal((question.match(/\?/g) ?? []).length, 1, pattern);
  }
});
