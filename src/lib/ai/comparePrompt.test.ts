import assert from "node:assert/strict";
import { test } from "node:test";
import type { Essay } from "@/lib/types";
import { buildComparePrompt, comparisonContextConflict, COMPARE_SYSTEM } from "./comparePrompt";

function essay(id: string, title: string, read: boolean): Essay {
  return {
    id,
    user_id: "student",
    title,
    prompt_text: "Tell us what matters to you.",
    word_limit: 650,
    current_draft: "",
    essay_kind: "personal_statement",
    school: null,
    last_feedback_at: read ? "2026-09-14T00:00:00.000Z" : null,
    revision_count: read ? 7 : 0,
    archived_at: null,
    archived_reason: null,
    created_at: "2026-09-14T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
  };
}

test("comparison is blind to titles and prior diagnostic history", () => {
  const prompt = buildComparePrompt(
    essay("old-id", "OLD VERSION — READ SEVEN TIMES", true),
    "Old draft words live here.",
    essay("new-id", "NEW FINAL VERSION", false),
    "New draft words live here.",
  );

  assert.match(prompt, /Old draft words live here/);
  assert.match(prompt, /New draft words live here/);
  assert.doesNotMatch(prompt, /OLD VERSION|NEW FINAL VERSION/);
  assert.doesNotMatch(prompt, /Readiness|not read yet|Open findings/);
});

test("comparison requires paired evidence and rejects chronology as evidence", () => {
  assert.match(COMPARE_SYSTEM, /direct contrast between specific evidence in A and specific evidence in B/);
  assert.match(COMPARE_SYSTEM, /Newer is not better/);
  assert.match(COMPARE_SYSTEM, /Every axis justification must contain evidence about both A and B/);
});

test("conflicting assignments are rejected in either presentation order", () => {
  const a = essay("a", "a", false);
  const b = { ...essay("b", "b", false), prompt_text: "Why this university?" };
  assert.ok(comparisonContextConflict(a, b));
  assert.equal(comparisonContextConflict(a, b), comparisonContextConflict(b, a));
  assert.throws(() => buildComparePrompt(a, "A", b, "B"));
  assert.ok(comparisonContextConflict(a, { ...a, word_limit: 250 }));
  assert.equal(comparisonContextConflict(a, { ...a, prompt_text: null }), null);
});
