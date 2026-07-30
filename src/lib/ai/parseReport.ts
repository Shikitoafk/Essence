import {
  type Confidence,
  type ParsedReport,
  type ParsedSpot,
  type Readiness,
  NUDGE_PATTERNS,
  READINESS_STAGES,
} from "@/lib/types";

/**
 * Parses the Mode A report emitted under the output contract in
 * `systemPrompt.ts`. Written defensively: a model that drifts on one field
 * should cost us that field, not the whole report.
 */

const SECTION_RE = /<<<SECTION:(\d)>>>/g;
const CARD_RE = /<<<CARD>>>([\s\S]*?)<<<ENDCARD>>>/g;

function splitSections(raw: string): Record<string, string> {
  const text = raw.replace(/<<<END>>>[\s\S]*$/, "");
  const sections: Record<string, string> = {};
  const marks: { n: string; start: number; end: number }[] = [];

  SECTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SECTION_RE.exec(text)) !== null) {
    marks.push({ n: m[1], start: m.index, end: m.index + m[0].length });
  }

  marks.forEach((mark, i) => {
    const stop = i + 1 < marks.length ? marks[i + 1].start : text.length;
    sections[mark.n] = text.slice(mark.end, stop).trim();
  });

  return sections;
}

function normalisePattern(value: string): string {
  const cleaned = value.replace(/^\[|\]$/g, "").trim();
  const hit = NUDGE_PATTERNS.find(
    (p) => p.toLowerCase() === cleaned.toLowerCase(),
  );
  if (hit) return hit;
  // Model drifted on the label — keep what it said rather than dropping the card.
  const loose = NUDGE_PATTERNS.find((p) =>
    cleaned.toLowerCase().includes(p.toLowerCase().split(",")[0]),
  );
  return loose ?? (cleaned || "Unlabelled pattern");
}

function normaliseConfidence(value: string): Confidence {
  const v = value.trim().toLowerCase();
  if (v.startsWith("high")) return "high";
  if (v.startsWith("low")) return "low";
  return "medium";
}

/** Strips wrapping quotes/blockquote markers the model may add despite the contract. */
function cleanQuote(value: string): string {
  let q = value.trim().replace(/^>\s*/, "");
  const pairs: [string, string][] = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
  ];
  for (const [open, close] of pairs) {
    if (q.length > 1 && q.startsWith(open) && q.endsWith(close)) {
      q = q.slice(1, -1).trim();
      break;
    }
  }
  return q;
}

function parseCard(body: string): ParsedSpot | null {
  const fields: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of body.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(pattern|confidence|quote|clear|unexplored|matters|question)\s*:\s*(.*)$/i,
    );
    if (match) {
      currentKey = match[1].toLowerCase();
      fields[currentKey] = match[2];
    } else if (currentKey && line.trim()) {
      // Contract says one line per field; tolerate a wrap rather than lose it.
      fields[currentKey] += ` ${line.trim()}`;
    }
  }

  const quote = cleanQuote(fields.quote ?? "");
  const question = (fields.question ?? "").trim();
  // A card with no anchor quote can't be highlighted or asked about — drop it.
  if (!quote || !question) return null;

  return {
    pattern_name: normalisePattern(fields.pattern ?? ""),
    confidence: normaliseConfidence(fields.confidence ?? ""),
    quoted_text: quote,
    what_is_clear: (fields.clear ?? "").trim(),
    what_is_unexplored: (fields.unexplored ?? "").trim(),
    why_it_matters: (fields.matters ?? "").trim(),
    question,
  };
}

/**
 * Section 7 lines look like `1. [3] <question text>` — the bracketed number is
 * the 1-based card index. Returns a permutation of `[0..spotCount)`.
 */
function parseQueue(section: string, spotCount: number): number[] {
  const order: number[] = [];
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+[.)]\s*\[(\d+)\]/);
    if (!match) continue;
    const idx = Number(match[1]) - 1;
    if (idx >= 0 && idx < spotCount && !order.includes(idx)) order.push(idx);
  }
  // Any card the queue forgot still needs asking — append in card order.
  for (let i = 0; i < spotCount; i++) {
    if (!order.includes(i)) order.push(i);
  }
  return order;
}

/**
 * Section 8 is the stopping signal. A missing or unrecognised verdict returns
 * null rather than a guess: inventing "done" would tell a student to stop when
 * the model never said so, and inventing "structural" would keep them circling.
 */
function parseReadiness(section: string): {
  readiness: Readiness | null;
  why: string;
  next: string;
} {
  const field = (name: string) =>
    section.match(new RegExp(`^\\s*${name}\\s*:\\s*(.*)$`, "im"))?.[1]?.trim() ??
    "";

  const raw = field("verdict").toLowerCase();
  const readiness = READINESS_STAGES.find((stage) => raw.includes(stage)) ?? null;

  return { readiness, why: field("why"), next: field("next") };
}

export function parseModeAReport(raw: string): ParsedReport {
  const sections = splitSections(raw);
  const readiness = parseReadiness(sections["8"] ?? "");

  const spots: ParsedSpot[] = [];
  const cardSource = sections["4"] ?? raw;
  CARD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CARD_RE.exec(cardSource)) !== null) {
    const spot = parseCard(m[1]);
    if (spot) spots.push(spot);
  }

  return {
    overall_impression: sections["1"] ?? "",
    checklist_findings: sections["2"] ?? "",
    framework_findings: sections["3"] ?? "",
    priorities: sections["5"] ?? "",
    strengths: sections["6"] ?? "",
    spots,
    queue: parseQueue(sections["7"] ?? "", spots.length),
    readiness: readiness.readiness,
    readiness_why: readiness.why,
    readiness_next: readiness.next,
  };
}

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
