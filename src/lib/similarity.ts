import { diffWords } from "diff";

/**
 * How much of two drafts is word-for-word the same, 0–1.
 *
 * Comparison exists to choose between two genuinely different versions. Two
 * drafts separated by a few line edits have nothing to choose between, and
 * asking a model to pick a winner would manufacture a distinction where none
 * exists — so that case is caught before spending a call.
 */
export function draftSimilarity(a: string, b: string): number {
  const left = a.trim();
  const right = b.trim();

  if (!left && !right) return 1;
  if (!left || !right) return 0;

  let shared = 0;
  let total = 0;

  for (const part of diffWords(left, right)) {
    const weight = part.value.length;
    // An unchanged run is present in both, so it counts once on each side.
    if (!part.added && !part.removed) {
      shared += weight * 2;
      total += weight * 2;
    } else {
      total += weight;
    }
  }

  return total === 0 ? 1 : shared / total;
}

/**
 * Above this, the two drafts are the same essay with edits. Deliberately high:
 * a false positive blocks a comparison the student wanted, which is worse than
 * letting a marginal pair through.
 */
export const NEAR_IDENTICAL_THRESHOLD = 0.95;

export function isNearIdentical(a: string, b: string): boolean {
  return draftSimilarity(a, b) >= NEAR_IDENTICAL_THRESHOLD;
}
