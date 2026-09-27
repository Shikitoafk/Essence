# Question output guard

Implementation and measurement note, 2026-09-27.

## Why this is a code policy

The Mode A prompt already tells the model to choose an editorial repair before
asking a question, to prefer cutting or selecting existing material, and to
request a new event only when the event itself is the missing unit. Saved reads
showed that the diagnosis could follow those principles while the final
question still reverted to an interview prompt: choose among a supplied list,
answer two prompts at once, or provide another specific scene.

Adding another prompt paragraph would leave the same failure probabilistic.
The application now protects the question after diagnosis. It preserves a
sound draft-specific question, removes empty “specific/concrete” padding, and
replaces known bad shapes with one decision appropriate to the diagnosis.
Selection, deletion and support tests come before requests for new biography.

This is consistent with the admissions-office evidence summarized in
[the personal-statement research](./personal-statement-ao-reading-2026-09-20.md):
the purpose is to understand the writer's perspective and choices, rather than
to reward maximum anecdote density or manufacture a dramatic topic.

## Saved-read measurement

Command:

```text
npx tsx scripts/question-shape.ts eval-out docs/research/reader-feedback-paired-2026-09-12
```

The script recursively reads saved Mode A responses and applies the exact
production question policy without calling a model. Prompt-contract
placeholders are excluded. On 27 card questions:

- clean mechanical shape: **8/27 (30%) → 27/27 (100%)**
- menus of suggested answers: **10/27 (37%) → 0/27**
- two prompts in one question: **6/27 (22%) → 0/27**
- “specific/concrete” padding: **11/27 (41%) → 0/27**
- median length: **24 → 14 words**

This proves the guard removes the measured forms; it does not prove that every
remaining question is insightful. Semantic quality still requires reading the
diagnosis and question together. Unknown pattern names keep their model-written
question instead of receiving a generic fallback, so the guard cannot silently
replace an unusual valid diagnosis with an unrelated question.

## Protected editorial decisions

The deterministic questions cover recurring diagnoses where the next action
is stable: replaceable portraits, stitched or repetitive episodes, unsupported
change, procedural narration, reflection gaps, generic endings, explanatory
debt, motifs and decorative detail. Other canonical diagnoses receive a safe
fallback only when the generated question has a measurable bad shape. This
keeps draft-specific questions where they are useful while preventing the
engine from treating every weakness as a request for more content.

## Repair intent is now explicit

Pattern names are allowed to be custom when the canonical vocabulary does not
fit. That flexibility previously created a hole: a custom label could bypass a
pattern-specific question policy even when the model had correctly decided
that the passage should be cut or selected against another passage.

Each new card therefore serializes the editorial action chosen before its
question: `cut`, `select_existing`, `clarify_existing`, `connect_existing`, or
`ask_missing`. The parser keeps the field optional for old saved reads. Known
diagnoses still take precedence; for custom names, a cut or selection decision
now produces the corresponding deletion or selection test. Clean questions for
genuinely missing material remain draft-specific. A malformed missing-material
question falls back to one open question rather than a menu supplied by the
engine.
