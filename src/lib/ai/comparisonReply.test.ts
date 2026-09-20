import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPARISON_AXES } from "@/lib/types";
import { validateComparisonReply } from "./comparisonReply";

function completeReply() {
  return {
    winner: "B",
    verdict_summary: "B makes the author's choices clearer.",
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

test("rejects malformed JSON shapes without throwing or choosing a default", () => {
  for (const value of [null, [], 1, "B", { ...completeReply(), winner: 2 },
    { ...completeReply(), axis_scores: {} },
    { ...completeReply(), axis_scores: [null, null, null, null, null] },
    { ...completeReply(), verdict_summary: " " },
    { ...completeReply(), transferable_elements: [{ quote: 5 }] },
    { ...completeReply(), axis_scores: [...completeReply().axis_scores, { axis: "extra" }] }]) {
    assert.equal(validateComparisonReply(value), null);
  }
});

test("returns validated transfer text and summary", () => {
  const parsed = validateComparisonReply({ ...completeReply(), transferable_elements: [
    { quote: " A real quote. ", destination_hint: "Opening", why: "Shows the choice." },
  ] });
  assert.equal(parsed?.transferable_elements[0].quote, "A real quote.");
  assert.equal(parsed?.verdict_summary, completeReply().verdict_summary);
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
