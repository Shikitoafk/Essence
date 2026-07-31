-- Essence — migration 005: head-to-head version comparison
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- Students often end up with two genuinely different versions of one essay — a
-- metaphor-led draft and a stripped one, say — each developed here, each with
-- its own history. With no way to choose, they oscillate, or they merge the two
-- and destroy the coherence of both. This is a decision tool: it always picks
-- one, and the losing version is archived so the choice stays made.

alter table public.essays
  add column if not exists archived_at timestamptz;

alter table public.essays
  add column if not exists archived_reason text;

create table if not exists public.essay_comparisons (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  version_a_id          uuid not null references public.essays (id) on delete cascade,
  version_b_id          uuid not null references public.essays (id) on delete cascade,
  winner_id             uuid not null references public.essays (id) on delete cascade,
  margin                text not null check (margin in ('clear', 'narrow')),
  verdict_summary       text not null default '',
  -- Per-axis result: [{ axis, winner_id, justification }]
  axis_scores           jsonb not null default '[]'::jsonb,
  -- At most three: [{ quote, from_version_id, destination_hint, why }]
  transferable_elements jsonb not null default '[]'::jsonb,
  accepted_at           timestamptz,
  created_at            timestamptz not null default now(),

  -- Exactly two distinct versions per comparison, never three or more.
  constraint comparison_distinct_versions check (version_a_id <> version_b_id),
  constraint comparison_winner_is_a_contender
    check (winner_id in (version_a_id, version_b_id))
);

create index if not exists comparisons_user_idx
  on public.essay_comparisons (user_id, created_at desc);

-- Finding a settled verdict for a pair, in either selection order.
create index if not exists comparisons_pair_idx
  on public.essay_comparisons (
    least(version_a_id, version_b_id),
    greatest(version_a_id, version_b_id),
    created_at desc
  );

create index if not exists essays_archived_idx
  on public.essays (user_id, archived_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Both sides of a comparison must belong to the signed-in user: the owner check
-- lives in the policy rather than a table constraint, since a CHECK cannot
-- query another table.
-- ---------------------------------------------------------------------------

alter table public.essay_comparisons enable row level security;

drop policy if exists "own comparisons" on public.essay_comparisons;
create policy "own comparisons" on public.essay_comparisons
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.essays e
                 where e.id = version_a_id and e.user_id = auth.uid())
    and exists (select 1 from public.essays e
                 where e.id = version_b_id and e.user_id = auth.uid())
  );
