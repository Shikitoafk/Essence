import assert from "node:assert/strict";
import { test } from "node:test";
import { parseModeAReport } from "./parseReport";
import { MAX_WORKING_WELL } from "@/lib/types";

const keep = (quote: string, why = "It carries the scene.") =>
  `<<<KEEP>>>\nquote: ${quote}\nwhy: ${why}\n<<<ENDKEEP>>>`;

const section9 = (body: string) =>
  `<<<SECTION:1>>>\nAn impression.\n<<<SECTION:9>>>\n${body}\n<<<END>>>`;

test("parses passages the read says to leave alone", () => {
  const report = parseModeAReport(
    section9(
      [
        keep("The fever lasted a week.", "Sets the stakes without dramatising."),
        keep("By August the drawers were full."),
      ].join("\n"),
    ),
  );

  assert.equal(report.working_well.length, 2);
  assert.equal(report.working_well[0].quote, "The fever lasted a week.");
  assert.match(report.working_well[0].why, /without dramatising/);
});

test("caps the list, since more would dilute the actionable spots", () => {
  const report = parseModeAReport(
    section9(
      Array.from({ length: 6 }, (_, i) => keep(`Passage number ${i}.`)).join("\n"),
    ),
  );
  assert.equal(report.working_well.length, MAX_WORKING_WELL);
});

test("a passage with no quote is dropped — that's a compliment, not an anchor", () => {
  const report = parseModeAReport(
    section9("<<<KEEP>>>\nwhy: The whole thing is lovely really.\n<<<ENDKEEP>>>"),
  );
  assert.equal(report.working_well.length, 0);
});

test("no section 9 at all is fine", () => {
  const report = parseModeAReport("<<<SECTION:1>>>\nJust an impression.");
  assert.deepEqual(report.working_well, []);
});

test("keep blocks don't leak into the spot cards", () => {
  const report = parseModeAReport(
    `<<<SECTION:4>>>
<<<CARD>>>
pattern: Reflection gap
confidence: high
impact: substantive
quote: It made me bolder.
clear: a
unexplored: b
matters: c
question: d
<<<ENDCARD>>>
<<<SECTION:9>>>
${keep("By August the drawers were full.")}
<<<END>>>`,
  );

  assert.equal(report.spots.length, 1);
  assert.equal(report.working_well.length, 1);
  assert.equal(report.spots[0].quoted_text, "It made me bolder.");
});

test("strips quotation marks the model wraps around a kept passage", () => {
  const report = parseModeAReport(
    section9('<<<KEEP>>>\nquote: "By August the drawers were full."\nwhy: x\n<<<ENDKEEP>>>'),
  );
  assert.equal(report.working_well[0].quote, "By August the drawers were full.");
});
