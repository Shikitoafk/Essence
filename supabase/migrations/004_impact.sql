-- Essence — migration 004: impact ratings and revision rounds
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- Impact answers the question a student actually has in front of a list of
-- flagged spots: is what's left important, or cosmetic? Without it every card
-- looks equally urgent, so a draft that only has taste-level notes reads as
-- broken and the student keeps editing.
--
-- The readiness verdict is now DERIVED from the open spots' impacts rather than
-- self-reported, so it cannot drift from what the cards actually say.

alter table public.flagged_spots
  add column if not exists impact text not null default 'substantive'
    check (impact in ('structural', 'substantive', 'polish'));

create index if not exists spots_essay_impact_idx
  on public.flagged_spots (essay_id, impact);

-- How many full diagnostic runs this essay has had. Past round 3 the interface
-- warns that essays usually stop improving and start losing voice.
alter table public.essays
  add column if not exists revision_count integer not null default 0;

-- The verdict vocabulary changed with the derivation rule; clear values written
-- under the old one rather than leaving a mix of both.
alter table public.essay_reports
  drop constraint if exists essay_reports_readiness_check;

update public.essay_reports
  set readiness = null
  where readiness in ('structural', 'developmental', 'polish', 'done');

alter table public.essay_reports
  add constraint essay_reports_readiness_check
    check (readiness in ('needs_work', 'strong', 'ready_to_submit'));
