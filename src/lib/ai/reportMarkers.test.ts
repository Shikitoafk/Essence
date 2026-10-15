import assert from "node:assert/strict";
import { test } from "node:test";
import { normaliseReportMarkers } from "./reportMarkers";
import { parseModeAReport } from "./parseReport";

test("complete standalone markers tolerate one or two lost closing brackets", () => {
  assert.equal(normaliseReportMarkers("<<<SECTION:1>\n<<<READING>>\n<<<ENDREADING>\n<<<END>>>"), "<<<SECTION:1>>>\n<<<READING>>>\n<<<ENDREADING>>>\n<<<END>>>");
});

test("missing terminators and marker-like prose remain unchanged", () => {
  const raw="<<<END\nThe label <<<END>>> is not a line boundary.\n<<<UNKNOWN>";
  assert.equal(normaliseReportMarkers(raw),raw);
});

test("a damaged card closing marker cannot leak into the question", () => {
  const report=parseModeAReport("<<<SECTION:4>\n<<<CARD>>>\nquote: The seam broke.\nquestion: What did you notice?\n<<<ENDCARD>\n<<<SECTION:5>\nCoverage.\n<<<END>>>");
  assert.equal(report.spots[0].question,"What did you notice?");
  assert.equal(report.coverage_note,"Coverage.");
});
