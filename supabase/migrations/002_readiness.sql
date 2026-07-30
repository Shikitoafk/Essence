-- Essence — migration 002: readiness verdict
--
-- Run this in the Supabase SQL editor if your database was created before this
-- feature existed. supabase/schema.sql already includes these columns for new
-- projects. Safe to re-run.
--
-- Why it exists: without a stopping signal, a tool built to find weaknesses
-- finds them forever and students edit in circles, eventually sanding away what
-- made the essay theirs. Each read now records how finished the draft is.

alter table public.essay_reports
  add column if not exists readiness text
    check (readiness in ('structural', 'developmental', 'polish', 'done'));

alter table public.essay_reports
  add column if not exists readiness_why text not null default '';

alter table public.essay_reports
  add column if not exists readiness_next text not null default '';
