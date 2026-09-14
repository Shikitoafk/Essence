import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPARISON_AXES } from "@/lib/types";
import { validateComparisonReply } from "./comparisonReply";

function completeReply() {
  return {
    winner: "B",
    axis_scores: COMPARISON_AXES.map((axis) => ({
      axis,
      winner: "B",
      justification: "A uses a declared lesson, while B reveals it in scene.",
    })),
  };
}

test("accepts one explicit decision for every axis", () => {
  const parsed = validateComparisonReply(completeReply());
  assert.equal(parsed?.winner, "B");
  assert.equal(parsed?.axes.size, 5);
});

test("never turns a missing overall winner into slot A", () => {
  assert.equal(validateComparisonReply({ axis_scores: completeReply().axis_scores }), null);
});

test("never fills a missing or invalid axis with the overall winner", () => {
  const missing = completeReply();
  missing.axis_scores.pop();
  assert.equal(validateComparisonReply(missing), null);

  const invalid = completeReply();
  invalid.axis_scores[0].winner = "tie";
  assert.equal(validateComparisonReply(invalid), null);
});
