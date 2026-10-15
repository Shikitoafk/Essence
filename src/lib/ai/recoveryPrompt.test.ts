import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRecoveryPrompt } from "./modeAPrompt";

test("recovery rechecks candidate hypotheses instead of mandating criticism", () => {
  const prompt=buildRecoveryPrompt("I repaired the seam.",[{line:"I repaired the seam. — none",paragraph:"I repaired the seam."}]);
  assert.match(prompt,/NOT confirmed defects/);
  assert.match(prompt,/There may be zero cards/);
  assert.match(prompt,/DROPPED:/);
  assert.match(prompt,/repair:/);
  assert.doesNotMatch(prompt,/do not re-litigate|You already judged these worth reporting|Emit one card per finding/);
});
