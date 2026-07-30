import type { FlaggedSpot } from "@/lib/types";

/**
 * Picks the spots that make up the current worklist.
 *
 * Each feedback run writes its cards against a new version, and only the newest
 * run belongs on screen — older runs describe drafts that no longer exist, and
 * showing them stacks near-identical cards on every re-read.
 *
 * The anchor is the newest run that actually PRODUCED spots, not the newest
 * report. A read can come back empty (the model finds nothing, or its output
 * fails to parse) while still writing a report row; anchoring to that would
 * blank the worklist and hide everything the student was mid-way through. A
 * barren read has to leave the previous cards standing.
 */
export function selectCurrentSpots(allSpots: FlaggedSpot[]): FlaggedSpot[] {
  const newest = allSpots.reduce<FlaggedSpot | null>(
    (best, spot) =>
      !best || spot.created_at > best.created_at ? spot : best,
    null,
  );
  if (!newest) return allSpots;
  return allSpots.filter((spot) => spot.version_id === newest.version_id);
}
