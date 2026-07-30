-- Essence — migration 003: close the loop on revision, not conversation
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- Why it exists: a spot used to become "resolved" the moment the student gave a
-- good answer in chat. But answering is not revising. The student was left with
-- their own material sitting in a chat bubble and no indication of what to do
-- with it, while the card said "resolved" and the essay had not changed.
--
-- There is now a stage in between: "answered" means the material exists,
-- "resolved" means it reached the draft.

alter table public.flagged_spots
  drop constraint if exists flagged_spots_status_check;

alter table public.flagged_spots
  add constraint flagged_spots_status_check
    check (status in ('open', 'answered', 'resolved', 'skipped'));

-- The concrete specifics the student surfaced in their answer that were not in
-- the draft — shown back to them, in their own words, so the material is
-- visible as material rather than buried in a conversation.
alter table public.flagged_spots
  add column if not exists new_material text[] not null default '{}';
