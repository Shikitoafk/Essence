import assert from "node:assert/strict";
import { test } from "node:test";
import { selectCurrentSpots } from "./currentSpots";
import type { FlaggedSpot } from "./types";

let seq = 0;
function spot(versionId: string | null, createdAt: string): FlaggedSpot {
  return {
    id: `spot-${seq++}`,
    essay_id: "essay-1",
    version_id: versionId,
    pattern_name: "Underdeveloped change",
    confidence: "high",
    quoted_text: "It made me bolder.",
    what_is_clear: "",
    what_is_unexplored: "",
    why_it_matters: "",
    question: "What changed?",
    queue_position: 0,
    status: "open",
    created_at: createdAt,
  };
}

test("shows only the newest run's spots", () => {
  const older = [spot("v1", "2026-07-01T10:00:00Z"), spot("v1", "2026-07-01T10:00:01Z")];
  const newer = [spot("v2", "2026-07-02T10:00:00Z")];

  const current = selectCurrentSpots([...older, ...newer]);
  assert.equal(current.length, 1);
  assert.equal(current[0].version_id, "v2");
});

test("a read that produced no spots leaves the previous ones standing", () => {
  // The regression: a barren re-read still writes a report row. Anchoring to
  // that report blanked the worklist and hid everything in progress.
  const existing = [
    spot("v1", "2026-07-01T10:00:00Z"),
    spot("v1", "2026-07-01T10:00:01Z"),
  ];

  const current = selectCurrentSpots(existing);
  assert.equal(current.length, 2, "previous spots must survive an empty re-read");
});

test("keeps every spot from the newest run, not just the newest spot", () => {
  const current = selectCurrentSpots([
    spot("v1", "2026-07-01T10:00:00Z"),
    spot("v2", "2026-07-02T10:00:00Z"),
    spot("v2", "2026-07-02T10:00:01Z"),
    spot("v2", "2026-07-02T10:00:02Z"),
  ]);
  assert.equal(current.length, 3);
  assert.ok(current.every((s) => s.version_id === "v2"));
});

test("an essay with no spots at all yields nothing", () => {
  assert.deepEqual(selectCurrentSpots([]), []);
});

test("tolerates spots written without a version", () => {
  // version_id is nullable: the snapshot insert can fail while the cards land.
  const current = selectCurrentSpots([
    spot(null, "2026-07-01T10:00:00Z"),
    spot(null, "2026-07-01T10:00:01Z"),
  ]);
  assert.equal(current.length, 2);
});

test("ordering of the input does not matter", () => {
  const shuffled = [
    spot("v2", "2026-07-02T10:00:00Z"),
    spot("v1", "2026-07-01T10:00:00Z"),
    spot("v2", "2026-07-02T10:00:01Z"),
  ];
  const current = selectCurrentSpots(shuffled);
  assert.equal(current.length, 2);
  assert.ok(current.every((s) => s.version_id === "v2"));
});
