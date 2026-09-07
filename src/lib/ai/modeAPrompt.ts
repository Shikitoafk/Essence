import {
  countWords,
  SUPPRESS_POLISH_FROM_ROUND,
  DIMINISHING_RETURNS_ROUND,
  type Essay,
} from "@/lib/types";

/**
 * Builds the Mode A user prompt.
 *
 * Lives outside the route so the same prompt the app sends can be run against a
 * model directly. A prompt that can only be produced by a signed-in request
 * through a database cannot be measured, and this one is the product's most
 * expensive call.
 */

export interface SeasonContext {
  facts: string[];
  otherEssays: { title: string; kind: string }[];
  previouslyResolved: string[];
  /** Which round of feedback this is — 1 for a first read. */
  round: number;
  /** The stage the previous read landed on, if there was one. */
  previousReadiness: string | null;
  /** True when this draft is identical to the one last read. */
  draftUnchanged: boolean;
  /** Quotes the student explicitly said had nothing more in them. */
  setAside: string[];
  /** Identity of the previous run's findings, for the stability check. */
  previousSpotKeys: string[];
}

export function buildModeAPrompt(
  essay: Essay,
  draft: string,
  context: SeasonContext,
): string {
  const parts: string[] = [];

  parts.push(
    essay.essay_kind === "supplemental"
      ? "This is a SUPPLEMENTAL essay. First infer the exact task from the student's pasted prompt, then apply only the checks that task requires. Do NOT assume it is a Why Us essay."
      : "This is a PERSONAL STATEMENT.",
  );

  parts.push(`Essay title: ${essay.title}`);
  if (essay.school) parts.push(`Target school: ${essay.school}`);
  parts.push(
    essay.prompt_text
      ? `The prompt the student is answering:\n${essay.prompt_text}`
      : "The student did not paste the prompt. Do not assume one.",
  );
  parts.push(
    essay.word_limit
      ? `Word limit: ${essay.word_limit}. Current draft: ${countWords(draft)} words.`
      : `No word limit set. Current draft: ${countWords(draft)} words. Ask the student for the limit if it matters.`,
  );

  if (context.facts.length > 0) {
    /*
     * These come from every essay the student has worked on, not just this one.
     * Left unqualified, the engine read them as facts about THIS draft's author
     * and faulted the essay for "dropping" a laboratory interest that belonged
     * to a different essay entirely — inventing a deficiency out of season
     * memory. The framing has to be explicit about what these are for.
     */
    parts.push(
      `Things this student has told you while working on their essays THIS SEASON — possibly on a different essay than this one:
${context.facts.map((f) => `- ${f}`).join("\n")}

Use these only to ask better questions and to avoid re-asking what you already know. They are NOT requirements for this draft. This essay is under no obligation to mention any of them, and an omission here is not a finding: never write that the draft "drops", "omits" or "fails to mention" something that appears only in this list. Judge the draft on what it is trying to do, not on material from another essay.`,
    );
  }

  if (context.otherEssays.length > 0) {
    parts.push(
      `The student's other essays this season:\n${context.otherEssays
        .map((e) => `- ${e.title} (${e.kind})`)
        .join(
          "\n",
        )}\nThese are titles and types only, not essay contents. Do not infer repeated facets, contradictions, or missing interests from titles. Cross-essay comparison requires actual supplied content.`,
    );
  }

  if (context.previouslyResolved.length > 0) {
    parts.push(
      `Passages already worked through and resolved in earlier rounds — don't re-flag them unless they've genuinely regressed:\n${context.previouslyResolved
        .map((q) => `- "${q}"`)
        .join("\n")}`,
    );
  }

  // The round number is what lets the engine tell real progress from circling,
  // and is the input to the readiness verdict in section 8.
  if (context.round === 1) {
    parts.push("This is the FIRST read of this essay.");
  } else if (context.draftUnchanged) {
    // The sharpest test of circling: an unchanged draft that comes back with a
    // fresh set of objections proves the findings were never the real ceiling.
    parts.push(
      `This is read number ${context.round}, and the draft is IDENTICAL to the one you read last time — not one word has been revised.${
        context.previousReadiness
          ? ` That read judged it "${context.previousReadiness}".`
          : ""
      } Nothing has been addressed, so nothing has improved and nothing has worsened: your verdict must be the same one, and your findings must be the same findings. Do NOT go looking for different problems in the same text — a new set of objections to an unrevised draft would mean the earlier read was incomplete or this one is invented. Say plainly that the draft is unchanged, restate what is still open, and tell the student that re-reading without revising cannot help them.`,
    );
  } else {
    parts.push(
      `This is read number ${context.round} of this essay.${
        context.previousReadiness
          ? ` The previous read judged it "${context.previousReadiness}".`
          : ""
      } If the problems from earlier rounds have genuinely been addressed, say so and rate what's left honestly. Do not manufacture a new tier of objections to justify this read.`,
    );
  }

  if (context.round >= SUPPRESS_POLISH_FROM_ROUND) {
    parts.push(
      `Round ${context.round}: raise your bar. Flag only what would genuinely change an admissions reader's impression of this applicant. Nothing you would describe as a matter of taste belongs in this read at all.`,
    );
  }

  if (context.setAside.length > 0) {
    parts.push(
      `The student already looked at these passages and said there was nothing more there. Do not raise them again under a different pattern name:\n${context.setAside
        .map((q) => `- "${q}"`)
        .join("\n")}`,
    );
  }

  parts.push(
    `Run Mode A on the draft below. Reply using the Mode A output contract exactly.\n\n--- BEGIN DRAFT ---\n${draft}\n--- END DRAFT ---`,
  );

  return parts.join("\n\n");
}

/**
 * The recovery prompt: cards for named paragraphs, and nothing else.
 *
 * It restates the card block rather than trusting the model to remember the
 * one in the output contract, and it says plainly what went wrong — a model
 * told only "write cards for these" starts hedging about whether they deserve
 * cards, and the read already decided that when it scanned them.
 */
export function buildRecoveryPrompt(
  draft: string,
  uncarded: { line: string; paragraph: string }[],
): string {
  const findings = uncarded
    .map((u, i) => `${i + 1}. ${u.line}\n   Paragraph: ${u.paragraph}`)
    .join("\n\n");

  return [
    "You have already read this draft and listed the places where a reader loses something. Some of those you neither carded nor dropped, so they are lost. Write the missing cards now.",
    "",
    "The full draft, for context:",
    draft,
    "",
    "The findings you made and did not report, each with the paragraph it points at:",
    findings,
    "",
    "Emit one card per finding above, in that order, and NOTHING else — no scan, no sections, no prose before or after. You already judged these worth reporting; do not re-litigate whether they qualify. Every quote must be a verbatim span of the draft above.",
    "",
    "<<<CARD>>>",
    "pattern: <the principle this breaks>",
    "confidence: <high | medium | low>",
    "impact: <structural | substantive | polish>",
    "quote: <exact verbatim span from the draft, on ONE line>",
    "clear: <what the reader does get as written>",
    "unexplored: <the specific gap>",
    "matters: <what it costs this essay>",
    "question: <one non-leading question, obeying every rule above>",
    "<<<ENDCARD>>>",
  ].join("\n");
}
