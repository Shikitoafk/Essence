import assert from "node:assert/strict";
import { test } from "node:test";
import { parseModeAReport } from "./parseReport";
import {
  deriveReadiness,
  isReadyToSubmit,
  type FlaggedSpot,
  type Impact,
  type SpotStatus,
} from "@/lib/types";

const spot = (impact: Impact, status: SpotStatus = "open") =>
  ({ impact, status }) as Pick<FlaggedSpot, "impact" | "status">;

/**
 * Readiness is derived from the flagged spots rather than announced by the
 * model, so the verdict and the cards can never contradict each other. These
 * pin the derivation, which is what actually tells a student to stop.
 */

test("a structural finding means the essay needs work", () => {
  assert.equal(
    deriveReadiness([spot("polish"), spot("structural"), spot("substantive")]),
    "needs_work",
  );
});

test("substantive findings without structural ones read as strong", () => {
  assert.equal(deriveReadiness([spot("substantive"), spot("polish")]), "strong");
});

test("only taste-level notes left means ready to submit", () => {
  assert.equal(deriveReadiness([spot("polish"), spot("polish")]), "ready_to_submit");
});

test("nothing flagged at all means ready to submit", () => {
  assert.equal(deriveReadiness([]), "ready_to_submit");
});

test("settled findings no longer hold the essay back", () => {
  // Resolved and set-aside work is done; only live findings should weigh.
  assert.equal(
    deriveReadiness([
      spot("structural", "resolved"),
      spot("substantive", "skipped"),
      spot("polish"),
    ]),
    "ready_to_submit",
  );
});

test("material gathered but not yet written still counts as open", () => {
  // Answering is not revising — an answered spot must not release the verdict.
  assert.equal(deriveReadiness([spot("structural", "answered")]), "needs_work");
  assert.equal(deriveReadiness([spot("substantive", "answered")]), "strong");
});

test("only ready_to_submit tells the student to stop", () => {
  assert.equal(isReadyToSubmit("needs_work"), false);
  assert.equal(isReadyToSubmit("strong"), false);
  assert.equal(isReadyToSubmit("ready_to_submit"), true);
  assert.equal(isReadyToSubmit(null), false);
});

test("parses the impact rating on a card", () => {
  const report = parseModeAReport(
    `<<<SECTION:4>>>
<<<CARD>>>
pattern: Generic closing claim
confidence: high
impact: structural
quote: Who weaves the threads?
clear: You want to end on a lesson.
unexplored: Nothing grounds it.
matters: It is the last line.
question: What are you still doing weekly because of that summer?
<<<ENDCARD>>>
<<<END>>>`,
  );
  assert.equal(report.spots[0].impact, "structural");
});

test("an unreadable impact falls back to substantive, never polish", () => {
  // Defaulting to polish would quietly declare a draft ready to submit;
  // defaulting to structural would trap a finished essay in revision.
  const report = parseModeAReport(
    `<<<SECTION:4>>>
<<<CARD>>>
pattern: Reflection gap
confidence: low
impact: quite important really
quote: Who weaves the threads?
clear: a
unexplored: b
matters: c
question: d
<<<ENDCARD>>>
<<<END>>>`,
  );
  assert.equal(report.spots[0].impact, "substantive");
});

test("section 8 carries reasoning, and no verdict to contradict the cards", () => {
  const report = parseModeAReport(
    `<<<SECTION:8>>>
why: Only taste-level choices remain.
next: This is ready — further edits risk flattening your voice.
<<<END>>>`,
  );
  assert.match(report.readiness_why, /taste-level/);
  assert.match(report.readiness_next, /ready/);
});
