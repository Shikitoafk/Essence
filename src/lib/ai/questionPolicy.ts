/**
 * A deterministic guard for diagnoses where generative models repeatedly
 * turn an editorial decision into a request for more biography.
 */
export function applyQuestionPolicy(pattern: string, question: string): string {
  const key = pattern.trim().toLowerCase();

  if (key === "replaceable portrait") {
    return "What do you most want the reader to understand about you here, and which existing part of the draft comes closest to showing it?";
  }

  if (key === "generic closing claim") {
    return "If you removed this broad closing claim, what meaning—if any—would the essay actually lose?";
  }

  return question.trim();
}
