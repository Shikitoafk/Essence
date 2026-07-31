-- Essence — migration 006: passages that already work
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- The Spots tab showed nothing but problems. A student working in a list of
-- pure criticism has no way to tell which passages are load-bearing, and edits
-- away the lines that were already doing the work. Each read now also names up
-- to three passages to leave alone.
--
-- Capped at three deliberately: more would dilute the actionable spots, which
-- is the opposite of the problem being fixed.

alter table public.essay_reports
  add column if not exists working_well jsonb not null default '[]'::jsonb;
