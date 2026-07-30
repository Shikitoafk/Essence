import assert from "node:assert/strict";
import { test } from "node:test";
import { parseModeAReport } from "./parseReport";
import { shouldStopReading } from "@/lib/types";

const withSection8 = (body: string) =>
  `<<<SECTION:1>>>\nSomething.\n<<<SECTION:8>>>\n${body}\n<<<END>>>`;

test("parses a full verdict", () => {
  const report = parseModeAReport(
    withSection8(
      [
        "verdict: developmental",
        "why: The arc holds, but the turn is asserted rather than shown.",
        "next: Answer the two open questions, then stop and rewrite in your own words.",
      ].join("\n"),
    ),
  );

  assert.equal(report.readiness, "developmental");
  assert.match(report.readiness_why, /arc holds/);
  assert.match(report.readiness_next, /rewrite in your own words/);
});

test("recognises every stage", () => {
  for (const stage of ["structural", "developmental", "polish", "done"]) {
    const report = parseModeAReport(withSection8(`verdict: ${stage}`));
    assert.equal(report.readiness, stage);
  }
});

test("a missing verdict is null, never a guess", () => {
  // Guessing "done" would tell a student to stop when nothing said so;
  // guessing "structural" would keep them circling. Neither is acceptable.
  assert.equal(parseModeAReport("<<<SECTION:1>>>\nProse only.").readiness, null);
  assert.equal(parseModeAReport(withSection8("why: no verdict line")).readiness, null);
  assert.equal(parseModeAReport(withSection8("verdict: excellent")).readiness, null);
});

test("tolerates decoration around the verdict word", () => {
  assert.equal(
    parseModeAReport(withSection8("verdict: **done**")).readiness,
    "done",
  );
  assert.equal(
    parseModeAReport(withSection8("Verdict:  Polish  ")).readiness,
    "polish",
  );
});

test("the verdict does not disturb the rest of the report", () => {
  const report = parseModeAReport(
    `<<<SECTION:1>>>\nAn impression.\n<<<SECTION:5>>>\n1. Do the thing.\n<<<SECTION:8>>>\nverdict: polish\n<<<END>>>`,
  );
  assert.equal(report.overall_impression, "An impression.");
  assert.match(report.priorities, /Do the thing/);
  assert.equal(report.readiness, "polish");
  assert.doesNotMatch(report.priorities, /verdict/);
});

test("only the finished stages tell the student to stop", () => {
  assert.equal(shouldStopReading("structural"), false);
  assert.equal(shouldStopReading("developmental"), false);
  assert.equal(shouldStopReading("polish"), true);
  assert.equal(shouldStopReading("done"), true);
  // An unparsed verdict must not be read as permission to stop.
  assert.equal(shouldStopReading(null), false);
});
