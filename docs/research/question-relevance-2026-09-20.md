# Follow-up relevance and comparison repairs

## Problem and changes

Mode B's core allowed interpretation and deletion, but its output contract
defined success as specific lived material and treated abstraction as a reason
to keep asking. Replaced that contradictory contract with resolution of the
original reader uncertainty. A present interpretation must remain present,
not become an invented past transformation. Cards now present answers as notes
to choose from, not material that all belongs in the essay.

The conversation route selected the first twenty messages, hiding new answers
after that point. It now selects the latest twenty and reverses them for the
model. This is a code fix independent of prompt quality.

Comparison now isolates its model override, rejects malformed model responses
and incompatible assignment contexts, and stores drafts in the same order used
by the model. Texture no longer means density of details; structure no longer
requires removing the essay's organizing device. These changes do not prove
that position bias is eliminated. No paired comparison-model evaluation was
run in this batch.

## Final prompt smoke measurement

Command: `scripts/bench-question-relevance.ts --before <frozen module>`.
Only newly authored synthetic scenarios were sent. No private essay or DM was
sent. Eight successful provider calls total: an exploratory four-call run,
then a final four-call run after removing another contradictory core sentence.
An initial sandboxed attempt failed before producing any response.

Final model requested and served: `gemini-3.5-flash-lite`, the default first
conversation model. Temperature 0.3 (production answer route uses 0.8).
One before/after pair per case, order reversed for the second case. This is
a smoke check, not a repeated production-quality measurement.

- Before MODE_B_SYSTEM SHA-256:
  `029ef4525f64cb03a3ce64f703c469f4aa62b8b296c6f753d0a535e91bd4f92f`
- Final MODE_B_SYSTEM SHA-256:
  `276e68c5ac7f6100889234a23e4845d55e678ee090d55fd2a2539a26a3f97ae5`
- Local ignored output: `eval-out/question-relevance/final-paired/`.
  Each response records both system and user-prompt hashes and served model.

Case: **cut an unsupported growth claim**. Both versions resolved the decision
to delete without requesting replacement material. No demonstrated improvement.

Case: **present interpretation of solitude and company**. Before: verdict
resolved, but reply nevertheless asked for two specific moments. It omitted
the timing distinction from new_material. After: resolved with no further
question, and preserved that the understanding arose now, not at the time.
This is a narrow positive observation; it does not establish general accuracy.

## Verification and limits

140 unit tests passed, TypeScript passed, and ESLint passed on modified source
files and the new harness. Windows tsx required a temporary os.userInfo shim
because the sandbox failed that OS lookup; no dependency was modified.
No production deployment, browser acceptance test, latency measurement or
full build was performed. Existing navigation changes remain local too.

Next measurement should add refusal, a mistaken diagnosis, a genuinely thin
answer, and repeated runs at production temperature. Comparison needs its own
same-model, swapped-order quality measurement; blind metadata is not proof of
an unbiased verdict.
