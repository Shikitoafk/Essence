-- Essence — migration 007: coverage note replaces the priorities list
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- Section 5 of the read used to be "Top 3 priorities". The model treated that
-- ceiling as a target and applied it to the cards as well: reads came back with
-- exactly three spots on drafts that plainly had six or seven distinct gaps,
-- and findings it had already made never reached the student.
--
-- The section is now a coverage note — one sentence confirming the cards are
-- the complete set of what the read found. Nothing is ranked, and nothing is
-- held back. The column keeps the old prose for reads taken before this.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'essay_reports'
      and column_name = 'priorities'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'essay_reports'
      and column_name = 'coverage_note'
  ) then
    alter table public.essay_reports rename column priorities to coverage_note;
  end if;
end $$;

alter table public.essay_reports
  add column if not exists coverage_note text not null default '';
