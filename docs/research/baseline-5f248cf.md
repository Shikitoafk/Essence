# Engine baseline — prompt 5f248cf

Measured 2026-09-08. The prompt is frozen as `scripts/prompt-baselines/5f248cf-mode-a.txt` (37,028 characters). Any later claim that a prompt change improved something is measured against this table, not against a memory of how it used to behave.

## Method

Eleven of the twelve cases in `essay-feedback-eval-cases.md`. Case 11 is a Mode B conversation case with no draft to read and is covered separately by `scripts/bench-conversation.ts`.

Three runs per case, temperature 0.6, all three runs of a case on the **same** model. Different cases sit on different models because the free tier allows twenty requests per day per model, and a comparison is only meaningful within a case. Numbers are spot cards emitted.

Run with `scripts/run-eval-cases.ts`. Nothing here is scored automatically: whether a read "identified that activity names do not explain the intellectual attraction" is a judgement, and a model from the same family grading its own output would launder that judgement rather than make it.

## Results

| Case | Model | Runs | Expected |
| --- | --- | --- | --- |
| 1 Named interest without thinking | 3.6-flash | 2, 2, 2 | a finding |
| 2 Thinking already visible | 3.6-flash | **0, 0, 0** | nothing — false-positive control |
| 3 Claimed connection | 3.6-flash | 2, 1, 2 | a finding |
| 4 Reciprocal adjustment present | 3.7-flash | **0, 0, 0** | nothing — control |
| 5 Decorative detail | 3.7-flash | 2, 2, 2 | a finding |
| 6 Honest explanation, limited disclosure | 3.7-flash | **0, 0, 0** | nothing — control |
| 7 Mechanical versus evolving image | 3.5-flash | 1, 1, 1 | a finding on the first excerpt only |
| 8 Joy without transformation (50 words) | 3.5-flash | **0, 0, 0** | nothing — control |
| 9 One fit connection versus name-dropping | 3.5-flash | 1, 1, 1 | a finding on response A only |
| 10 Same subject is not duplicate content | 3.5-flash | **0, 0, 0** | nothing — control, and a regression test |
| 12 Coverage without a card quota | 3.5-flash | 5, 5, 5 | around five distinct gaps |

## What it says

**Ten of eleven cases returned an identical count in all three runs.** The engine is not drifting between runs on these models.

**Every control held, in all fifteen runs.** Cases 2, 4, 6, 8 and 10 exist to catch a read that manufactures findings — a response that already shows its reasoning, a relationship already reciprocal, a disclosure the writer explicitly limited, a fifty-word answer that lands its task, and an excerpt whose subject overlaps other essays. None of them drew a single card. Case 10 doubles as the regression test for the cross-essay boundary: in six runs across two days no read claimed the excerpt repeated the other essays whose titles it was given.

**Case 12 hit the expected number every time.** Five findings, three runs, on the case built to check that coverage is not capped.

**Case 3 is the only unstable one, and mildly.** Its primary card, "Detached from others" (structural), appears in every run. A second card on "This proved that I could connect with anyone" appears in two of three. Both are legitimate under the case's expectations; the spread is one borderline finding, not a different reading.

## Caveats, stated so they are not forgotten

Counts are not quality. A read returning two cards every time may be returning the same two wrong cards every time; the counts say the engine is consistent, not that it is right. Scoring the content against each case's expectations is still a human pass and has not been done in full.

Three models are involved, one per group of cases, so cases are not comparable to each other — only runs within a case are.

`gemini-3.8-flash` was dropped: twelve consecutive calls over two days returned 503. That is Google-side overload rather than quota, and it makes the model unusable for measurement.

An earlier attempt at this table was run on `gemini-3.5-flash-lite`, where the same prompt produced ten cards in one run and two in the next, and a scan block that came back empty in one run and full in the next on identical input. That variance belongs to the lite models and was briefly mistaken for the prompt's. Measure on the models the product serves from.
