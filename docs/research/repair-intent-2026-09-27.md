# Repair-intent semantic check

Implementation and measurement note, 2026-09-27.

## Setup

The run checked whether a correct diagnosis produces the correct editorial
action before it produces a question. It used prompt SHA `59f65a6a` and saved
the raw response together with the question the application would actually
deliver. Cases 3, 4, 14, 15 and 16 ran once on `gemini-3.6-flash`. Case 18 ran
once on `gemini-3.5-flash` after the 3.6 daily quota was exhausted, so it is a
separate stress observation rather than a model comparison.

One run per case can expose concrete failures; it does not establish a pass
rate or eliminate model variance.

## Results

- Case 3 produced one request for missing participant evidence and one deletion
  test for an overearned conclusion. Neither question supplied the answer.
- Case 4, the reciprocal-adjustment control, produced no cards.
- Case 14 identified the decorative grandfather paragraph and its mechanical
  callback as cuts in a response over its word limit. It did not request more
  material.
- Case 15 selected among existing episodes instead of interviewing the writer
  for a fourth episode.
- Case 16, a complete quiet-reflection control, produced no cards.
- Case 18 produced four cards: three cuts and one selection decision after the
  application applied its question policy. It did not answer a 713-word draft
  by asking the student to add more.

This supports the new repair vocabulary's intended direction: deletion and
selection now occur before requests for missing material. It does not prove
that every diagnosis is complete. Case 18 missed the decorative library
description and the unsupported claim that the writer no longer rushes.

## Parser failure found by the run

The raw responses for cases 14 and 15 contained valid cards, but the harness
initially reported zero. The model had repeated `<<<SECTION:n>>>` where a
closing marker would go, and in case 14 repeated `<<<CARD>>>` instead of
emitting `<<<ENDCARD>>>`. A repeated empty section then overwrote the populated
one.

The parser now preserves the first populated body for a section, accepts a
repeated card marker as a closing boundary, and falls back to recovering cards
from the complete response. A regression test covers the exact drift. Reparse
of the saved raw outputs recovered both case 14 cards and the case 15 card.

## Why the free strengths section was removed

Case 18 exposed a separate failure. Its unanchored strengths paragraph praised
the library's golden light and observational voice even though that description
was the clearest removable material in an over-limit draft. The same response
was making useful cut decisions elsewhere.

The output contract no longer requests section 6. Effective writing is named
only through section 9 KEEP blocks, each tied to an exact quote and an account
of the effect that would be lost by editing it. The database and parser retain
the legacy `strengths` field so old reports remain readable, while the workspace
stops displaying that unanchored prose.
