# Reading for the writer's perspective

Research and implementation notes, 2026-09-12. This is prompt development,
not model fine-tuning. Existing uncommitted strengths-section edits were
preserved. Sources inform editorial judgment; they do not prove admission
causation or establish mandatory characteristics of a successful essay.

## Source observations and limits

### David M., The Secret Ingredient is Connection

[Essay and committee commentary](https://apply.jhu.edu/hopkins-insider/the-secret-ingredient-is-connection/).
The user supplied the complete essay and comments. The committee connects
experimentation and sharing food to the person behind the activities.
Our editorial reading: successive episodes add different evidence of the
same person's curiosity, attentiveness and relationships. Adjusting food for
other participants makes care legible without a recipient's quoted reaction.
The explicit ending gathers the meaning rather than automatically spoiling it.
This is evidence against requiring one episode, concealed reflection, or
dramatic change in every essay. It is not a reason to copy this structure or
declare the essay flawless. The full published text is not embedded in the
production prompt or committed as an eval fixture.

### Etina R., Developing Roots

[Essay and committee commentary](https://apply.jhu.edu/hopkins-insider/developing-roots/).
The committee values the reflective use of botanical knowledge to articulate
belonging and individual development. Our inference: an extended analogy and
direct interior explanation can reveal a person without a conventional scene
and aftermath for every claim. Independence and interdependence can form a
coherent tension. An editor should test whether the comparisons communicate
that tension, rather than replacing the form with a chronology of actions.

### Ruoni T., Clean Closet

[Essay and committee commentary](https://apply.jhu.edu/hopkins-insider/clean-closet/).
The committee relates an ordinary task to identity, memory and openness to
change. Actions and reflection work together; details matter because they
explain what the objects mean and what letting go entails. Our inference:
do not confuse a common topic with generic treatment, or demand more detail
when a detail already connects an experience to an interpretation.

### Yale admissions

[Essay advice](https://admissions.yale.edu/essays) explicitly distinguishes
perspective from topic rarity. [Essays: What Works](https://admissions.yale.edu/posts/2020-06-15-episode-4-essays-what-works)
discusses reflection and a recognizable personal voice, including the risk of
over-editing. Our implementation treats familiar topics, plain voices, and
different forms as legitimate. It does not translate one speaker's preference
for vividness into an obligation to add scenes.

### ElevatEd

[Requested video](https://www.youtube.com/watch?v=Q6HP0FxjK2I): the browser
verified the title, creator, full description and chapter list. Transcript
export returned unavailable; the visible transcript panel remained loading.
We did not watch or transcribe the complete spoken review. The description
discusses an exception to a topic rule, mixed showing and explanation, and
character revealed through writing choices. These are description-level
observations only, not a claim to have assessed the underlying student's essay.

[Public rubric](https://www.elevated.school/essay-rubric/) was read. Useful:
distinguishing labels for qualities from their personal expression, and
considering thought processes. Not adopted: admission-linked score thresholds,
percentile claims, mandatory trait coverage, demographic assumptions, or a
fixed problem-to-solution ratio. Those would turn an interpretive aid into a
formula. Linked Google Docs examples exposed titles only to web retrieval;
their annotations were not available and are not cited as read.

## Concrete changes

- Replace impossible sentence-level uniqueness with a supported portrait.
- Read the draft's own form and the contribution of each episode.
- Allow several facets and unresolved tensions without forcing one virtue.
- Distinguish changed interpretation from changed behavior when asking for evidence.
- Select a repair before writing its question; protect already useful material.
- Explain strengths as textual choices producing a reader effect.
- Remove the strengths example's accidental preference for implicit endings.

## Evaluation design

`scripts/bench-author-perspective.ts` freezes the exact pre-edit prompt and
compares it to the current prompt using identical inputs on one named model.
Input/system hashes, order and raw reports are saved. Before/after order
alternates across cases. Each variant gets one call per case, no fallback or
quota retry. A failed call stops the experiment and is recorded.

The optional supplied essay is stripped of committee commentary and outcome
information. Three independent synthetic fixtures probe: a coherent montage,
the same topic reduced to virtue claims, and an earned interior contradiction.
Fixture wording is not included in the system prompt. These are development
checks, not a held-out estimate of general quality. Inspect the questions and
explanations; card counts alone cannot establish improvement.

Execution: the first baseline request returned HTTP 429. The run stopped with
zero completed reads; there is no before/after quality result. Frozen prompts,
input hash and failure manifest are in ignored
`eval-out/author-perspective-2026-09-12/`. No model switching or quota retries
were attempted. The final cleanup also removes the old checklist's contradictory
single-idea and mandatory-failure heuristics; a fresh run must use that final
prompt rather than an earlier candidate snapshot.

All 130 local tests, TypeScript and diff whitespace checks passed on the final
text, including the checklist cleanup. Static tests check software and
prompt contracts, not editorial accuracy. This revision is an implementation
of sourced editorial principles, not a demonstrated improvement in model
outputs. It remains local and has not been committed or pushed in this turn.
