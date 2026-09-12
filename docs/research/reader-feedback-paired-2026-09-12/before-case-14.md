# Case 14. A draft over its limit, with something to remove
Model: gemini-3.6-flash · run 1 · supplemental · 150 words
Prompt: .next/reader-paired/before.txt

## Draft
I want to study civil engineering because a bridge is an argument about load.

My grandfather kept a tin of washers on the windowsill. The tin was green, dented on one side, with a lighthouse on the lid worn almost away. I sorted them by size on the kitchen table while he worked, and the kitchen smelled like cut metal. I remember the light in that kitchen better than most rooms I have lived in.

Last year our school footbridge closed for repairs and the detour added eleven minutes to my walk. I started timing it, then started asking why a bridge built in 1998 needed steel plates bolted under its supports in 2025. The city inspection report was public. I read it twice and understood about half.

What I understood was that the report described a problem in the deck and a fix in the supports, and never explained the connection between them. I want to read that document and know whether the answer is right.

The tin is still on the windowsill.

## Expected (from the cases file)
the response is 174 words against a 150-word limit, and the strongest finding is that the tin paragraph and its closing callback are the 68 words that pay for the overrun twice over — they are the only passage that does not bear on the question asked. A read that asks what the grandfather taught the writer, or for more of the kitchen, has proposed spending words the draft does not have. At least one finding must be answerable by deleting rather than adding, and any finding that asks for new material must name what it displaces. Rationale: across about thirty reads of six drafts of one essay, no card ever proposed removing anything, and a read of a 781-word draft against a 650-word limit raised no card about the overrun. Every named pattern the engine has means something is missing.

## Raw read
<<<SCAN>>>
THROUGH-LINE: The writer frames civil engineering as an investigation into how physical structures handle load, earned by their analysis of an unresolved discrepancy in a local bridge inspection report. The core inquiry is clear and compelling, but nostalgic childhood detail consumes words needed to stay under the 150-word budget.
My grandfather kept a tin of washers on the windowsill. — Nostalgic background detail decorates the essay rather than showing intellectual engagement with engineering, crowding the word budget.
The tin is still on the windowsill. — Mechanical motif callback to the nostalgia rather than the footbridge inquiry.
DROPPED: The tin is still on the windowsill. — Addressed by the card on the grandfather's tin passage, as both concern the same structural choice to prioritize atmospheric backstory over the central engineering inquiry.
<<<ENDSCAN>>>

<<<SECTION:1>>>
This draft presents a clear, authentic entry point into civil engineering through the writer's direct analysis of a municipal footbridge inspection report. The transition from a practical inconvenience (an eleven-minute detour) to reading technical reports and spotting a contradiction between deck damage and support repairs demonstrates genuine intellectual curiosity. The primary issue is structural focus and length: nostalgic description of the grandfather's kitchen consumes word count without advancing the engineering inquiry, leaving the draft 24 words over the 150-word limit.
<<<SECTION:2>>>
- Detail decorates instead of working: "My grandfather kept a tin of washers on the windowsill." The sensory memory of sorting washers establishes atmosphere, but does not show active intellectual engagement with engineering, crowding the word budget.
<<<SECTION:3>>>
- Why Major Prompt Fit: The essay fulfills the prompt's demand for intellectual evidence through the footbridge inspection analysis, which shows an active analytical habit of mind rather than a general desire or résumé list.
- Structural Balance: The draft splits its short word count between childhood atmosphere and high-school inquiry; in a 150-word essay, atmospheric framing competes directly with the primary intellectual demonstration.
<<<SECTION:4>>>
<<<CARD>>>
pattern: Detail decorates instead of working
confidence: high
impact: substantive
quote: My grandfather kept a tin of washers on the windowsill.
clear: This passage describes a vivid childhood memory of sorting washers and remembering kitchen light.
unexplored: How this childhood memory connects to the intellectual inquiry about bridge loads, or whether it belongs in a short essay that is currently over word limit and centered on structural analysis.
matters: Spending over fifty words on nostalgic backstory leaves the essay 24 words over the 150-word limit and takes space from the stronger intellectual demonstration in the footbridge analysis.
question: If you were to remove the tin memory to bring the essay under the word limit, what essential part of your interest in civil engineering, if any, would be missing?
<<<ENDCARD>>>
<<<SECTION:5>>>
Every distinct substantive issue identified in this read is covered by the spot card in section 4.
<<<SECTION:6>>>
The draft excels when it grounds the choice of major in concrete analysis. Defining a bridge as an "argument about load" establishes an immediate, thoughtful stance on the discipline. The movement from an eleven-minute detour to reading a public inspection report—and specifically noticing that the city fixed supports for a deck problem—demonstrates an active habit of questioning physical logic rather than just asserting an interest.
<<<SECTION:7>>>
1. [1] If you were to remove the tin memory to bring the essay under the word limit, what essential part of your interest in civil engineering, if any, would be missing?
<<<SECTION:8>>>
why: The draft effectively answers the prompt through specific analytical engagement with the bridge report, but is currently 24 words over the 150-word limit due to decorative backstory.
next: Decide whether to cut the tin motif so the draft fits the 150-word limit while preserving the footbridge inspection analysis in full.
<<<SECTION:9>>>
<<<KEEP>>>
quote: What I understood was that the report described a problem in the deck and a fix in the supports, and never explained the connection between them.
why: This line presents concrete intellectual evidence by showing the writer actively analyzing a technical contradiction in a real report.
<<<ENDKEEP>>>
<<<KEEP>>>
quote: I want to study civil engineering because a bridge is an argument about load.
why: This framing immediately establishes a clear intellectual perspective on the major.
<<<ENDKEEP>>>
<<<END>>>