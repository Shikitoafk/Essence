/**
 * The contract requires each quote to be a verbatim substring of the draft so
 * the editor can highlight it. Models drift on whitespace and smart quotes, so
 * we re-anchor loosely and rewrite the stored quote to the draft's own text.
 * Returns null when the quote can't be found at all.
 */
export function locateQuote(
  draft: string,
  quote: string,
): { start: number; end: number; text: string } | null {
  if (!quote) return null;

  const exact = draft.indexOf(quote);
  if (exact !== -1) {
    return { start: exact, end: exact + quote.length, text: quote };
  }

  // Build a whitespace/punctuation-tolerant matcher over the draft.
  const fold = (s: string) =>
    s
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .toLowerCase();

  const foldedDraft = fold(draft);
  const foldedQuote = fold(quote);

  const direct = foldedDraft.indexOf(foldedQuote);
  if (direct !== -1) {
    return {
      start: direct,
      end: direct + foldedQuote.length,
      text: draft.slice(direct, direct + foldedQuote.length),
    };
  }

  // Last resort: collapse runs of whitespace, tracking original offsets.
  const offsets: number[] = [];
  let collapsed = "";
  let inSpace = false;
  for (let i = 0; i < foldedDraft.length; i++) {
    const ch = foldedDraft[i];
    if (/\s/.test(ch)) {
      if (inSpace) continue;
      inSpace = true;
      offsets.push(i);
      collapsed += " ";
    } else {
      inSpace = false;
      offsets.push(i);
      collapsed += ch;
    }
  }
  const collapsedQuote = foldedQuote.replace(/\s+/g, " ").trim();
  const found = collapsed.indexOf(collapsedQuote);
  if (found === -1) return null;

  const start = offsets[found];
  const lastIdx = found + collapsedQuote.length - 1;
  const end = (offsets[lastIdx] ?? foldedDraft.length - 1) + 1;
  return { start, end, text: draft.slice(start, end) };
}
