/**
 * The Mode B user prompt: one spot, its history, and the student's last message.
 *
 * Out of the route so the conversation can be measured. Mode A had a harness
 * and twelve cases; this half of the product had neither, and it is the half a
 * student spends the most time in.
 */
import type { ConversationMessage, Essay, FlaggedSpot } from "@/lib/types";

export function buildModeBPrompt(
  spot: FlaggedSpot,
  history: Pick<ConversationMessage, "role" | "content">[],
  facts: string[],
  wordLimit: number | null,
  essayKind: Essay["essay_kind"],
  promptText: string | null,
  school: string | null,
  intent: "answer" | "ask",
): string {
  const parts: string[] = [];

  parts.push(
    `You are working ONE flagged spot. Here is its card — this is the only part of the essay under discussion right now:

Pattern: ${spot.pattern_name}
Confidence: ${spot.confidence}
The line from the draft, verbatim: "${spot.quoted_text}"
What is clear: ${spot.what_is_clear}
What is still unexplored: ${spot.what_is_unexplored}
Why it matters here: ${spot.why_it_matters}
The question you asked about it: ${spot.question}`,
  );

  if (wordLimit) parts.push(`The essay's word limit is ${wordLimit}.`);

  if (essayKind === "supplemental") {
    parts.push(
      promptText
        ? `This is a supplemental. Its actual prompt is:\n${promptText}\nStay faithful to that prompt. Do not turn a non-Why-Us response into a Why Us answer or invent school resources.`
        : `This is a supplemental, but its prompt was not provided. Do not assume it is a Why Us essay or claim it fails an unknown prompt.${school ? ` The target school is ${school}, but that alone does not make school-specific detail required.` : ""}`,
    );
  }

  if (facts.length > 0) {
    parts.push(
      `Things this student has already told you this season — reference them naturally instead of re-asking:\n${facts
        .map((f) => `- ${f}`)
        .join("\n")}`,
    );
  }

  parts.push(
    `The exchange on this spot so far, oldest first:\n${history
      .map(
        (m) => `${m.role === "assistant" ? "You" : "Student"}: ${m.content}`,
      )
      .join("\n\n")}`,
  );

  parts.push(
    intent === "ask"
      ? "The student's most recent message is a QUESTION for you, not an answer to yours. Answer it directly and usefully, and remember: explaining what kind of material a passage needs is help; supplying the words is not."
      : "Judge the student's most recent message against the Mode B rules and reply using the Mode B output contract. Remember: never write any part of the essay for them.",
  );

  return parts.join("\n\n");
}
