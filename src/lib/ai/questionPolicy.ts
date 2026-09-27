import {
  cleanQuestionWording,
  questionShapeIssues,
} from "./questionShape";

const EDITORIAL_DECISION_QUESTIONS: Record<string, string> = {
  "replaceable portrait":
    "Which existing part of the draft comes closest to showing the person you want the reader to understand?",
  "generic closing claim":
    "If you removed this broad closing claim, what meaning—if any—would the essay actually lose?",
  "generic or overearned ending":
    "If you removed this broad closing claim, what meaning—if any—would the essay actually lose?",
  "explanation debt":
    "If you removed this explanation, what understanding—if any—would the preceding material no longer carry on its own?",
  "trait sections with visible seams":
    "Which existing part of the draft carries the person you most want the reader to meet?",
  "episodes that repeat one facet":
    "Which existing episode reveals something about you that the others do not?",
  "is anyone here":
    "Which existing part of the draft most clearly shows how you think or relate to other people?",
  "disconnected episodes":
    "What would the essay lose if this later material were removed?",
  "underdeveloped change":
    "What in the existing draft shows that this change lasted beyond the moment?",
  "procedural narration":
    "Where in this process did you make a judgment of your own?",
  "procedure without judgment":
    "Where in this process did you make a judgment of your own?",
  "reflection gap":
    "What do you understand here that the sequence of events alone does not show?",
  "thinking named rather than performed":
    "What question was actually occupying you here?",
  "change claimed but not supported":
    "What in the existing draft supports a change this broad?",
  "false before-and-after":
    "What made your earlier position reasonable to you at the time?",
  "mechanical motif":
    "If this callback disappeared, what changed meaning—if any—would the ending lose?",
  "decorative detail":
    "If you removed this detail, what meaning—if any—would disappear with it?",
};

/**
 * A deterministic guard for diagnoses where generative models repeatedly
 * turn an editorial decision into a request for more biography.
 */
export function applyQuestionPolicy(pattern: string, question: string): string {
  const key = pattern.trim().toLowerCase();
  const editorialDecision = EDITORIAL_DECISION_QUESTIONS[key];
  if (editorialDecision) return editorialDecision;

  const cleaned = cleanQuestionWording(question);
  if (questionShapeIssues(cleaned).length === 0) return cleaned;

  // These questions are about the editorial decision already diagnosed. They
  // do not seed a scene, emotion, relationship or candidate answer.
  const safeFallbacks: Record<string, string> = {
    "topic without subject":
      "What do you want this material to reveal about you that its topic alone cannot?",
    "perception missing":
      "What did you notice here that the sequence of events does not show?",
    "productive contradiction flattened":
      "What becomes less true if these two tendencies are reduced to one lesson?",
    "other people without agency":
      "What does the draft currently let the other person choose?",
    "activity paragraph replacing person":
      "What does this paragraph reveal that an activities list could not?",
    "borrowed voice":
      "What idea here would remain if the admissions language disappeared?",
    "reader trust":
      "What claim can this passage support without overstating what happened?",
    "prompt mismatch":
      "Which part of the prompt is this passage answering?",
  };

  return safeFallbacks[key] ?? cleaned;
}
