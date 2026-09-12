# Reader-centered feedback: initial implementation and smoke check

Changed Mode A questions to permit interpretation, selection and deletion instead of requiring an additional event. Mode B now judges relevance rather than detail count. Overall impression asks for a supported picture of the writer. Section 6 remains parser-compatible but uses one brief paragraph instead of three age-based summaries. The human review supplied by the user concerns a different essay; its ending preference is not treated as an admissions rule.

Validation: 130 tests pass; TypeScript passes. These checks validate code/contracts, not editorial accuracy.

Three live requests to gemini-3.6-flash used synthetic cases only. No before/after comparison was run, so no quality gain is established.

- Case 15, first revision: identified disconnected episodes and asked how, if at all, they connect. Also demanded an unnecessary additional insight at the ending and uncarded aftermath in next steps. Partial failure.
- Case 16, first revision: zero cards; protected a useful explicit reflection. Passed this single smoke check.
- Case 15, final revision: connection diagnosis remained useful, but the model still prescribed expansion and rated the generic ending structural. Failed restraint/repair-selection expectations despite the new instructions. Do not claim the detail-seeking problem is fixed.

Raw reports are locally in .next/reader-feedback-eval and .next/reader-feedback-eval-final (temporary, ignored). Candidate prompt edits remain local for review; no deployment is implied. Existing changes to SpotCard and bench-diagnostic predate this work.

Next evaluation should compare frozen prompts on identical inputs, include repetition/deletion and interior-reflection cases, and inspect the meaning of questions rather than their length or count. Existing scan drop rules and generic-ending lenses still favor creating additional cards; address those competing instructions before scaling evaluation. No model fine-tuning was performed.
