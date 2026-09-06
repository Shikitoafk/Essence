# Essay-feedback evidence review

Reviewed 2026-09-06. First research batch, not an exhaustive literature review or a trained model. Read 18 examples and their accompanying commentary/outlines: seven JHU personal statements, five CEG Why Major examples, six CEG Why College examples. Also read Yale's admissions discussion. No source essays are copied into the application or a training dataset.

## Source ledger and transferable observations

The observations below are paraphrases. Product rules derived from them are our editorial hypotheses, not university-endorsed scoring criteria.

| Source / examples read | Observation | Application to Essence |
| --- | --- | --- |
| [JHU: Ordering the Disorderly](https://apply.jhu.edu/hopkins-insider/ordering-the-disorderly/) | The committee values self-reflection revealed through a scientific metaphor, not simply the future career named. | Judge what the metaphor reveals; a career statement is neither sufficient nor mandatory. |
| [JHU: Balancing Life; A Life of Balance](https://apply.jhu.edu/hopkins-insider/balancing-life-a-life-of-balance/) | Several pursuits can jointly communicate a recognizable approach to life. | Do not reject a montage or activity list automatically; inspect its contribution and progression. |
| [JHU: The Secret Ingredient is Connection](https://apply.jhu.edu/hopkins-insider/the-secret-ingredient-is-connection/) | Everyday baking reveals experimentation and relationships through decisions. | A detail matters through its function, not its exoticness. |
| [JHU: Developing Roots](https://apply.jhu.edu/hopkins-insider/developing-roots/) | The commentary emphasizes cross-disciplinary thinking and the balance between independence and mutual support. | Look for reasoning and reciprocal relationships rather than compulsory heroic impact. |
| [JHU: The Two Sides of America](https://apply.jhu.edu/hopkins-insider/the-two-sides-of-america/) | The committee highlights a perspective that recognizes dignity across communities. | A shift in interpretation can carry depth without a grand intervention. |
| [JHU: Clean Closet](https://apply.jhu.edu/hopkins-insider/clean-closet/) | Small actions support reflection about identity and change. | Assess proportionate evidence for a claimed change; do not demand dramatic events. |
| [JHU: In the Belly of the Ship](https://apply.jhu.edu/hopkins-insider/in-the-belly-of-the-ship/) | Returning after disappointment and engaging with others show persistence. | Trace choices across time rather than awarding depth for an unusual setting. |
| [CEG: Why Major](https://www.collegeessayguy.com/blog/why-major-college-essay) — Electrical Engineering; Gender and Sexuality Studies; Neuroscience; Literary Arts/Modern Culture and Media; multiple interests | The examples use different lengths and structures to connect experience to academic interests. Short answers can prioritize direct content over elaborate scenes. | Match depth to the requested task and word budget. Do not treat the guide's example outlines as universal requirements. |
| [CEG: Why College](https://www.collegeessayguy.com/blog/why-this-college-essay) — Michigan; Penn; Tufts; Cornell; Bowdoin; Swarthmore | The guide contrasts broad lists, fewer developed connections, one shared value, and hybrid approaches. It critiques how easily generic school details can be swapped. | Assess the student's reason for fit, not the count of professors or courses. One connection may suffice when the actual prompt permits it. Historic resources mentioned in examples are not verified current offerings. |
| [Yale: Episode 35](https://admissions.yale.edu/posts/episode-35), essay discussion | Officers caution against packing everything into one essay, equating selected published essays with typical admitted writing, and sacrificing ordinary voice for elaborate presentation. They discuss feeling and reflection as distinct from tidy lessons. | Preserve directness and uncertainty. Published selections cannot establish admission cutoffs or guarantees. |

## Important disagreements and limits

- These are selected successful examples, not a representative dataset with rejected controls. We cannot infer which feature caused admission or calculate admissions probabilities.
- CEG is a coaching source, not an admissions committee. Its recommendation to connect major and personal-statement topics is not proof that different interests contradict each other. We retain the narrower rule: flag actual incompatibility only with evidence.
- JHU's favorable comments are not claims that every sentence is flawless. Conversely, Essence disagreeing with a passage does not prove the committee was wrong.
- School-specific values should not become universal demands for service, professional ambition, or extroversion.
- Our consent, privacy, anti-fabrication, and no-AI-authorship-inference protections are product safeguards, not empirical findings from these essay examples.

## Changes made

1. Six diagnostic lenses added to `ENGINE_REFINEMENTS` section S: thinking, reciprocal relationships, functional detail, selection/progression, proportionate change, and supplemental depth per word.
2. Shared `EDITORIAL_CALIBRATION` overrides conflicting legacy heuristics in diagnosis, answer follow-up, and user-question chat. It does not change the serialization contracts.
3. Kept full coverage separate from the three-item priority list; removed the new four-to-eight-card numerical anchor. Card count follows substantive evidence, including zero.
4. Removed a request to infer cross-essay repetition from titles in the feedback API context.
5. Added static prompt wiring and seven-card parser regressions. These tests do NOT measure Gemini's editorial quality.

## Evaluation before calling this an improvement

Use `essay-feedback-eval-cases.md` for original synthetic challenge cases. They are development probes, not a hidden test set or source essays. Do not upload private student drafts without permission.

For a controlled comparison, freeze old/new prompt versions, model version, generation settings, and full task context. Run each case three times per prompt; shuffle labels before human scoring. Grade each expected finding and prohibited behavior independently, not by number of cards. Record missed substantive gaps, unsupported flags, exact quote anchors, helpful/non-leading questions, prompt adherence, voice preservation, and correct stopping. Any invented personal detail, written replacement prose, admissions guarantee, or pressure after refusal is a critical failure.

Follow with consented real drafts covering personal statements, supplements, short answers, stronger and weaker writing, and multilingual applicants. Keep some drafts unseen during prompt revision. Have a qualified reviewer and the student assess usefulness; resolve disagreements explicitly. Prefer improved gap recall only when false positives and critical failures do not increase. Set a release threshold before reviewing results.

No paid model calls or fine-tuning were performed for this review. Changing a system prompt is instruction refinement, not weight training. Any later fine-tuning would require a rights-cleared, consented set of draft/context → expert-feedback pairs, separate holdout data, and comparison against this prompt baseline.
