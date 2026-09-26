/**
 * A deterministic guard for diagnoses where generative models repeatedly
 * turn an editorial decision into a request for more biography.
 */
export function applyQuestionPolicy(pattern: string, question: string): string {
  const key = pattern.trim().toLowerCase();

  if (key === "replaceable portrait") {
    return "What do you most want the reader to understand about you here, and which existing part of the draft comes closest to showing it?";
  }

  if (key === "generic closing claim" || key === "generic or overearned ending") {
    return "If you removed this broad closing claim, what meaning—if any—would the essay actually lose?";
  }

  if (key === "explanation debt") {
    return "If you removed this explanation, what understanding—if any—would the preceding material no longer carry on its own?";
  }

  if (key === "trait sections with visible seams") {
    return "Which existing part of the draft carries the person you most want the reader to meet, and what would actually be lost by cutting the rest?";
  }

  if (key === "mechanical motif") {
    return "If this callback disappeared, what changed meaning—if any—would the ending lose?";
  }

  if (key === "decorative detail") {
    return "If you removed this detail, what understanding of you or the situation—if any—would disappear with it?";
  }

  return question.trim();
}
