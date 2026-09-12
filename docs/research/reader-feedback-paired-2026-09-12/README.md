# Repair selection: paired smoke check, 2026-09-12

## Method

Three identical synthetic inputs (cases 14, 15, 16), gemini-3.6-flash, temperature 0.6, one request per case per prompt. All before requests preceded all after requests; order was not counterbalanced. No fallback model. Six successful requests. Baseline is the local prompt at the start of this turn, not deployed main. Reports here contain full inputs and raw outputs. This tests initial Mode A, not the production recovery pass, UI or Mode B.

## Changes tested

Allow rejecting candidates that fail the finding test without requiring the writer to justify every omission. Merge two findings when one actual edit resolves both; retain independent findings. Limit aftermath requests to claims that need aftermath. Permit cutting an unnecessary generic conclusion instead of asking the writer to earn it with new material.

## Results

Case 14: both variants identify over-budget decorative material and suggest trimming. Baseline actually offers the clearer deletion question; the candidate adds inflated praise and implies sorting washers leads to structural inquiry. No demonstrated improvement.

Case 15: both variants identify disconnected achievements. Both also ask for additional self-revelation to support a generic ending. Candidate still produces two cards, despite a single deletion being a reasonable repair. Repair-selection goal FAILED in this pair. Connection questions permit 'no connection', which is useful but already true of the baseline.

Case 16: both variants emit zero cards and preserve an earned explicit reflection. Control passes in this pair.

Do not infer improvement from card counts (1,2,0 in both), scan counts, or shorter prompt length. Scan counts include THROUGH-LINE. Single runs cannot establish repeatability. These cases have now informed development and are not held-out tests.

## Validation and release decision

130 tests pass, TypeScript passes, git diff --check passes. Prompt-text assertions test constraints, not model behavior. Updated assertions remove obsolete requirements that forced every omission into a card.

Quality gain is NOT established. Do not deploy this candidate as a resolved fix. No commit or push was made. Next work should test a smaller complete diagnostic contract with independent held-out cases, rather than adding another exception to the current large prompt. A corrective model call has not been added: extra latency/quota would need measured benefit first.