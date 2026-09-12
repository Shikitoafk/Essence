# Prompt handoff: Codex to Claude

Starting HEAD: `b45affe` (measurement prompt stamps). This handoff records a
local separation of the working changes, not an automated cross-agent lock.

## Ownership

Codex is making no Gemini API calls and hands the next measurement slot and
`systemPrompt.ts` editing slot to Claude after this commit. No background API
job was started by Codex in this handoff. A new slot needs explicit coordination
through Rinat; this document cannot stop another process or reserve quota at
the provider. A 429 alone does not identify the exhausted quota window.

## Commit boundary

The author-perspective commit contains Codex's editorial changes, source notes,
five synthetic fixtures, and the paired author-perspective harness. It excludes
Claude's strengths-section experiment in both the guide and section 6 output
contract, together with its test changes. Those remain in the working tree.
Codex's explicit-ending clarification is in the ending lens so it does not
depend on Claude's experimental strengths example.

To measure section 6 in isolation, freeze the committed prompt first, then
freeze the working candidate. Do not call the earlier historical prompt a
section-6-only baseline: it also differs in the editorial interpretation rules.

## Measurement provenance

`bench-author-perspective.ts` already computes SHA-256 `systemHash` from the
exact system string passed to `generateContent`, and `inputHash` from the exact
user prompt. It saves these with model, temperature and order for each completed
read and failed request. These fields predate this handoff. Hashing establishes
which inputs ran, not whether their comparison is causally clean.

Before/after order alternates across fixtures. This is one call per version per
case, not repeated within-case AB/BA. The optional supplied baking essay is not
committed. Published essays and committee praise are not automatic zero-finding
gold labels. Expectations for synthetic fixtures do not enter model input.

## Editorial caution

Hopkins showcases are institutionally selected positive examples; they cannot
reveal what caused admission or represent the entire admitted pool. Claims
about the exact selection motives remain hypotheses. Yale's negative examples
also reflect selected practitioner observations, not unbiased ground truth.

Reader response is useful evidence when linked to a passage and a loss of
understanding. A report that says nothing clicked still needs to explain where
and why. Predicted memorability is not an objective standard. The next work
should measure question relevance and voice, not add another checklist merely
because a new source was read.
