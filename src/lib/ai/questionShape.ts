/**
 * Mechanical question defects that can be rejected without judging the essay.
 *
 * This deliberately does not decide whether a question is insightful. It only
 * catches shapes that make a good answer harder: menus supplied by the model,
 * two prompts hidden in one sentence, and links the student is forced to
 * confirm before they have answered.
 */
export const QUESTION_SHAPE = {
  menu: /,[^,?]*\bor\b/i,
  compound:
    /,\s*and\s+(what|how|why|who|when)\b|\band\s+(what|how)\s+did\b/i,
  presupposedLink:
    /\bhow (did|does|has)\b[^?]*\b(shape|shaped|connect|connects|connected|protect|protects|inform|informs|change|changed|lead|led|prepare|prepares)\b/i,
  suppliedAnswer: /\bwas it (that )?[^?]*\bor\b[^?]*\?/i,
} as const;

export type QuestionShapeIssue =
  | keyof typeof QUESTION_SHAPE
  | "multipleQuestions";

export function questionShapeIssues(question: string): QuestionShapeIssue[] {
  const issues: QuestionShapeIssue[] = (
    Object.entries(QUESTION_SHAPE) as [
      keyof typeof QUESTION_SHAPE,
      RegExp,
    ][]
  )
    .filter(([, pattern]) => pattern.test(question))
    .map(([name]) => name);

  if ((question.match(/\?/g) ?? []).length > 1) {
    issues.push("multipleQuestions");
  }
  return issues;
}

export function cleanQuestionWording(question: string): string {
  return question
    .trim()
    .replace(/\b(specific|concrete)\s+/gi, "")
    .replace(/\s+/g, " ");
}
