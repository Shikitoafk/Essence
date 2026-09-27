import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanQuestionWording,
  questionShapeIssues,
} from "./questionShape";

test("finds menus, compounds, supplied answers and multiple questions", () => {
  assert.deepEqual(
    questionShapeIssues(
      "Was it pressure from home, or fear of failure, and what did you do? Why?",
    ),
    ["menu", "compound", "suppliedAnswer", "multipleQuestions"],
  );
});

test("finds a causal link the question asks the student to confirm", () => {
  assert.deepEqual(
    questionShapeIssues("How did the fever change your relationship with biology?"),
    ["presupposedLink"],
  );
});

test("does not reject a short open question", () => {
  assert.deepEqual(
    questionShapeIssues("What question was actually occupying you here?"),
    [],
  );
});

test("cleans empty specificity adjectives without changing the question", () => {
  assert.equal(
    cleanQuestionWording("  What concrete choice did you make?  "),
    "What choice did you make?",
  );
});
