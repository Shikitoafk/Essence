import { locateQuote } from "./parseReport";

/**
 * A diagnosis the read states in prose but never anchors to a card is a
 * criticism the student can read and cannot work on: only cards get
 * highlighted in the editor, and only cards become follow-up questions. The
 * engine prompt forbids leaving one stranded there, but a prompt rule the
 * model breaks silently is not a guarantee — so the prose is checked against
 * the cards it was supposed to produce.
 *
 * The check is deliberately narrow. It looks only for a passage the prose
 * quotes out of the draft, because that is the one case where "which line is
 * this about" has a deterministic answer. A diagnosis written without a quote
 * is invisible to this and always will be; catching those needs a reader, not
 * a parser.
 */

/**
 * Long enough that a match against the draft means the prose is pointing at
 * that passage rather than colliding with a common phrase. Rubric shorthand —
 * `no "so what"`, `Point 3` — falls under the floor and never reaches the
 * draft lookup.
 */
const MIN_QUOTE_CHARS = 24;

const QUOTE_RE = /[“"]([^“”"\r\n]{24,400})[”"]/g;

export interface ProseSection {
  /** Human-readable name, used only in the operator warning. */
  section: string;
  text: string;
}

export interface ProseOnlyDiagnosis {
  section: string;
  /** The draft's own wording, re-anchored the way a card's quote would be. */
  quote: string;
}

interface Span {
  start: number;
  end: number;
}

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Returns the passages quoted by the diagnostic prose that no card anchors to.
 *
 * Pass only the sections that state problems. Sections 6 and 9 quote the draft
 * to say what is working, and a passage praised there needs no card — running
 * them through here would report the essay's best lines as coverage gaps.
 */
export function findProseOnlyDiagnoses(
  draft: string,
  prose: ProseSection[],
  cardQuotes: string[],
): ProseOnlyDiagnosis[] {
  const cardSpans: Span[] = [];
  for (const quote of cardQuotes) {
    const located = locateQuote(draft, quote);
    if (located) cardSpans.push({ start: located.start, end: located.end });
  }

  const found: ProseOnlyDiagnosis[] = [];
  const reported: Span[] = [];

  for (const { section, text } of prose) {
    if (!text) continue;

    QUOTE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = QUOTE_RE.exec(text)) !== null) {
      const candidate = match[1].trim();
      if (candidate.length < MIN_QUOTE_CHARS) continue;

      // Not in the draft: the model is quoting itself, a rubric point, or a
      // line it invented. Only the last is a problem, and it is a different
      // one — fabrication, not coverage.
      const located = locateQuote(draft, candidate);
      if (!located) continue;

      if (cardSpans.some((span) => overlaps(span, located))) continue;

      // Two sections rarely quote a passage identically — one takes the whole
      // sentence, the next a fragment of it. Overlap, not an exact span, is
      // what makes them the same missing card.
      if (reported.some((span) => overlaps(span, located))) continue;
      reported.push({ start: located.start, end: located.end });

      found.push({ section, quote: located.text });
    }
  }

  return found;
}
