# Reading idea and voice

The reported product problem is that feedback polishes structure without making
a useful judgment about the essay's idea or the particular person on the page.
The existing system already contains extensive guidance about both. More
instruction text alone does not establish that the reader applies it reliably.

## Implemented experiment

Section 1 now requires separate readings of the person, idea and voice, with
verbatim evidence and an explanation of the effect of each quotation. It also
names one editorial priority or protects the working draft. A familiar topic,
plain language and a quiet earned ending do not count against an essay.

The server validates quote anchors and requires a substantive or structural
card for a stated revision priority. A contradictory keep judgment, missing
evidence or truncated response returns an incomplete-read error before replacing
the saved report or its cards. This validates the report's completeness and
internal consistency; it does not validate literary taste.

The existing overall_impression column stores the formatted reading, so no
database migration is required. Old reports remain readable. A first read under
the new contract is allowed even if an old saved draft is unchanged. Cache reuse
now checks the version referenced by the latest report rather than the newest
manually saved version. New complete reads open the Full read tab first.

## Executed checks

- Quote anchoring and report compatibility tests passed.
- Tests cover missing voice, invented evidence, an uncarded conceptual revision,
  an inconsistent keep judgment, multiline quote display, and cache eligibility.
- Type checking and targeted lint passed.
- Production build passed with network access for the existing Google Fonts.

## Model evidence and limits

All model inputs were existing fictional fixtures. No friend's private essay was
used. The original system was frozen in ignored eval-out before changes. The
paired harness records prompt hashes and the served model; expectations never
enter the model input.

Gemini 3.8 Flash completed both versions of repair-montage. Both recognized a
particular person and an earned idea. The revised report supplied grounded idea
and voice readings but treated the final line as a substantive liability, a
disputable editorial decision. This is not evidence that the new reader has
superior literary taste. The final prompt additionally asks for evidence against
a proposed criticism and the cost of cutting an earned ordinary ending.

On polished-no-person the original prompt already identified the replaceable
portrait, generic closing pledge and universal interpretation as losses. Thus
the original system is capable of this distinction on at least this fictional
case; the user's observed failures cannot be attributed solely to a missing rule.
The revised run stopped with HTTP 503. Earlier calls returned 503 on 3.6/3.5 and
404 on 2.5. A final smoke check on the final prompt and listed 3.7 model also
stopped with 503. The account's model list request succeeded. These results do
not establish the cause or permanence of provider unavailability.

The final revision has not completed a paired live evaluation and is not deployed.
No default model chain, billing or monetization setting was changed.

## Next quality gate

Use consented real essays and held-out variants alongside the fictional controls.
Remove admission outcomes, authors' names and version labels from evaluator input.
Include plain strong writing, decorative writing with little personal perspective,
a promising idea with rough structure, and revisions that accidentally erase voice.
Have readers independently explain their preference before seeing Essence output.
Record legitimate disagreements rather than treating one reader's taste as truth.

Inspect whether the tool identifies the actual idea and explains voice with
evidence, whether the primary repair changes the portrait rather than only prose,
and whether it preserves effective passages. Review unnecessary criticism as
seriously as missed weaknesses. Compare versions on the same served model and
record incomplete reads and rejected reports, not just successful examples.

Continue free user acquisition and collect feedback from returning users. Keep
paid features deferred until usefulness and repeat use are demonstrated. A small
synthetic smoke test or registration count is not enough to support premium
claims about admissions expertise or extraordinary literary judgment.
