# Published-review benchmark — 12 October 2026

## Question

Does Essence recognize the person, idea and voice that published human readers value, and do its revision requests preserve them?

This is a private diagnostic study, not model training, an admission prediction or a literary-accuracy certification.

## Corpus and source roles

- 10 essays/reviews supplied by the user. The collection corresponds to the [2022 sponsored Harvard Crimson feature](https://www.thecrimson.com/topic/sponsored-successful-harvard-essays-2022/). The reviews are consultant commentary, not Harvard admissions committee decisions.
- 5 current official [JHU Essays That Worked](https://apply.jhu.edu/college-planning-guide/essays-that-worked/) with separately stored admissions committee comments: [Connection](https://apply.jhu.edu/hopkins-insider/the-secret-ingredient-is-connection/), [Roots](https://apply.jhu.edu/hopkins-insider/developing-roots/), [Two Sides](https://apply.jhu.edu/hopkins-insider/the-two-sides-of-america/), [Closet](https://apply.jhu.edu/hopkins-insider/clean-closet/), [Ship](https://apply.jhu.edu/hopkins-insider/in-the-belly-of-the-ship/).
- All 25 essays plus consultant analyses in the user's 145-page scanned *Ivy League Playbook* PDF. [Publisher](https://www.penguin.co.in/book/the-ivy-league-playbook/). Athena commentary is valuable editorial context, not an independent AO label.

Public-source retrieval: 2026-10-12. Sources primarily select positive examples. Full copyrighted texts and model outputs remain in a private local library, outside tracked source files.

## Method

Runner: `scripts/bench-published-reviews.ts`. It uses the real Essence system prompt, draft prompt builder, parsers, candidate recovery and reading acceptance checks. No application database writes occur. This is a local engine benchmark, not 40 HTTP requests to the deployed site. Its recovery attempt uses the first conversation model, rather than the route's complete fallback chain.

Only the essay enters the model. External author/title/school/review/outcome metadata is withheld; names and institutions occurring inside the essay itself are retained. Context is empty. Original word limits are unknown and represented by null. Human reviews are read separately for editorial comparison.

Comparable 40-case batch: `gemini-3.5-flash-lite`, temperature 0.6, one primary generation per essay. This is a real product fallback, selected as an explicit research override after service failures during preliminary default-chain probes. Those probes included 503 and 404 responses; this does not establish that the primary model always fails or behaves like the fallback. Recovery temperature is 0.4.

Current system instruction SHA-256:

`d45f5f14afa19d15bd795fd90106194c82e7ab9f96c2094bc586b60917007e15`

Old system snapshot SHA-256:

`9dcba5cc57574f47ca2954887124fe31808b12bc91a7996b26fe95e50c94daef`

Five successful same-model old/new controls were obtained. The larger paired study was interrupted by transport failures. Do not claim a measured improvement in literary quality from that incomplete comparison.

The first Playbook OCR extraction lost some first body lines and mishandled page continuations. Its corpus/results were preserved as v1, corrected, and all 25 essays rerun as v2. Final comparisons use the 15 clean supplied/JHU results plus the corrected 25 Playbook v2 results. Paragraph reconstruction remains approximate and residual OCR errors limit sentence-level craft judgments.

## Recorded results

- 40/40 primary generations returned text.
- 67 cards parsed from primary outputs.
- The old recovery pass added 149 cards: 216 total. This is a count of feedback, **not** a count of real defects.
- 28/40 original final reports passed the complete evidence-backed reading guard. A returned model response therefore does not necessarily mean a usable application report.
- Offline replay with the repaired marker parser accepts 32/40 of the same responses with their saved old recovery cards. This is deterministic format/grounding recovery, not a new model judgment or proof of better taste.
- The narrow no-gap filter prevents 23 explicitly negative scan rows from becoming recovery candidates. Remaining candidate hypotheses still require judgment.

Private evidence locations:

- `C:/Users/PC/Desktop/Essay-Reference-Library/benchmark-2026-10-12/corpus-all.json`
- `.../replay.json` (technical replay; saved raw results remain unchanged)
- `.../comparison.json` (40 editorial annotations)
- `eval-out/published-reviews-lite-2026-10-12/` (15 clean results and provisional Playbook v1)
- `eval-out/published-reviews-playbook-v2-2026-10-12/` (corrected 25)
- `.../supplied-03-fixed-recovery.json` and `.../supplied-06-fixed-recovery.json` (two live post-fix recovery probes)

## Specific findings

### Reading a device versus prohibiting it

JHU explicitly values the tree metaphor in *Developing Roots* for expressing community, independence and reflective thinking across disciplines. Essence identifies that idea but recommends removing the botanical frame as mechanical. This is a real editorial conflict, not absence of theme recognition.

Playbook's Aastha essay uses a mock paper, and Raghav gives a bag a narrative voice. The model treats these devices as borrowed voice or artificial containers and proposes broad removal. An effective critique must assess their function and costs before prescribing a different concept. Consultant background about how a device arose is additional context the model was not supplied; failure to know it is not itself a model error.

The albatross essay supplies a useful counterexample: both model and human reader question the broad ending while recognizing genuine research curiosity. The superstition essay's primary response accepts a portrait built through contradictions without imposing a transformation arc. Essence can recognize a person and voice; it is not consistently a trustworthy editor of them.

### Recovery manufactures work

On the punk essay the primary pass emitted one card. The scan included paragraphs explicitly marked `none`; old recovery treated them as overlooked findings, then added 12 cards. On the JHU baking essay, 12 recovery cards were similarly added after a one-card primary read. These are separate from any legitimate disagreement about a concluding sentence.

The repaired no-gap filter now excludes explicit no-problem rows. Recovery instructions re-evaluate hypotheses, permit `DROPPED` with reasons and zero cards, and include the missing `repair` field. On the **same saved primary punk response**, a live post-fix recovery call returned zero cards and dropped the remaining genuine hypothesis: one final card instead of 13. On the saved superstition primary response, a second live probe still generated one debatable ending card. Do not infer that overcriticism is fully solved.

### Formatting can hide valid reading

Some complete `ENDREADING` / section / card markers were missing closing brackets. They could reject a complete reading or leak marker/prose text into a question. The parser now canonicalizes only known, complete, standalone markers; it never supplies an absent terminator or guesses corrupt prose. Regression tests cover those boundaries.

## Implementation and verification

Local changes: narrow no-gap filter; recovery may reject hypotheses; complete-marker normalization across the parser, reading parser and feedback route. Main system instruction was not revised during this benchmark; previous local person/idea/voice changes remain uncommitted.

Verification: 175 tests passed; TypeScript passed; targeted lint passed; production build passed with network access for existing Google Fonts. The first sandboxed build failed fetching fonts, not compiling the changed code.

No deployment, model fine-tuning or admission-outcome validation occurred.

## Limits and next evaluation

Manual comparisons are one editor's assessments, not independent blind AO grading. Human praise is not ground truth, especially in sponsored consultant material. Public texts may have appeared in model pretraining. This mostly positive corpus tests false criticism and preservation of unconventional devices, not discrimination between good and bad essays.

Next meaningful experiment: paired variants that keep the same facts but weaken voice, flatten the idea or introduce an actual unsupported transition; randomize order, obtain independent judgments and measure whether Essence recommends preserving the stronger version. Before removing a device, require its function, demonstrated cost, benefit and proportionate repair. Do not require additional scenes when existing behavior already supplies the evidence.
