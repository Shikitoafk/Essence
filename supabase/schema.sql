-- Essence — database schema
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: everything is guarded with IF NOT EXISTS / DROP POLICY IF EXISTS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.essays (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null default 'Untitled essay',
  prompt_text      text,
  word_limit       integer,
  current_draft    text not null default '',
  essay_kind       text not null default 'personal_statement'
                     check (essay_kind in ('personal_statement', 'supplemental')),
  school           text,
  last_feedback_at timestamptz,
  -- Full diagnostic runs so far. Past round 3 the interface warns that essays
  -- usually stop improving and start losing voice.
  revision_count   integer not null default 0,
  -- Set when a version loses a head-to-head comparison. Archived essays stay
  -- readable and restorable but leave the main list, because two equally
  -- visible versions is what keeps students flip-flopping.
  archived_at      timestamptz,
  archived_reason  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.essay_versions (
  id         uuid primary key default gen_random_uuid(),
  essay_id   uuid not null references public.essays (id) on delete cascade,
  draft_text text not null,
  word_count integer not null default 0,
  label      text,
  created_at timestamptz not null default now()
);

create table if not exists public.flagged_spots (
  id                 uuid primary key default gen_random_uuid(),
  essay_id           uuid not null references public.essays (id) on delete cascade,
  version_id         uuid references public.essay_versions (id) on delete set null,
  pattern_name       text not null,
  confidence         text not null default 'medium'
                       check (confidence in ('high', 'medium', 'low')),
  -- How much this finding matters. Lets a student see at a glance whether what
  -- remains is important or cosmetic, instead of treating every card as urgent.
  impact             text not null default 'substantive'
                       check (impact in ('structural', 'substantive', 'polish')),
  quoted_text        text not null,
  what_is_clear      text not null default '',
  what_is_unexplored text not null default '',
  why_it_matters     text not null default '',
  question           text not null default '',
  queue_position     integer not null default 0,
  -- 'answered' sits between open and resolved: the student has surfaced the
  -- material in conversation, but it hasn't reached the draft yet. Answering is
  -- not revising, and the card shouldn't claim otherwise.
  status             text not null default 'open'
                       check (status in ('open', 'answered', 'resolved',
                                         'skipped')),
  -- The concrete specifics from the student's own answer that weren't in the
  -- draft, shown back so the material is visible as material.
  new_material       text[] not null default '{}',
  created_at         timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  essay_id        uuid not null references public.essays (id) on delete cascade,
  flagged_spot_id uuid references public.flagged_spots (id) on delete cascade,
  role            text not null check (role in ('assistant', 'user')),
  content         text not null,
  created_at      timestamptz not null default now()
);

-- Sections 1, 2, 3, 5 and 6 of the Mode A report (the prose the spot cards sit in).
create table if not exists public.essay_reports (
  id                 uuid primary key default gen_random_uuid(),
  essay_id           uuid not null references public.essays (id) on delete cascade,
  version_id         uuid references public.essay_versions (id) on delete set null,
  overall_impression text not null default '',
  checklist_findings text not null default '',
  framework_findings text not null default '',
  priorities         text not null default '',
  strengths          text not null default '',
  -- How finished the draft is. Gives the process an endpoint so students don't
  -- edit in circles chasing an essay that is already working.
  -- Derived from the open spots' impacts, not self-reported, so the verdict and
  -- the cards can never contradict each other.
  readiness          text
                       check (readiness in ('needs_work', 'strong',
                                            'ready_to_submit')),
  readiness_why      text not null default '',
  readiness_next     text not null default '',
  -- Up to three passages the read says to leave alone. Without these the Spots
  -- tab is pure criticism, and students edit away what already works.
  working_well       jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

-- Season memory: durable facts a student surfaced in conversation.
create table if not exists public.essay_facts (
  id           uuid primary key default gen_random_uuid(),
  essay_id     uuid not null references public.essays (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  fact         text not null,
  is_sensitive boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Rate-limit ledger for Gemini calls.
create table if not exists public.ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('feedback', 'conversation')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists essays_user_idx           on public.essays (user_id, updated_at desc);
create index if not exists versions_essay_idx        on public.essay_versions (essay_id, created_at desc);
create index if not exists spots_essay_idx           on public.flagged_spots (essay_id, queue_position);
create index if not exists messages_essay_idx        on public.conversation_messages (essay_id, created_at);
create index if not exists reports_essay_idx         on public.essay_reports (essay_id, created_at desc);
create index if not exists facts_essay_idx           on public.essay_facts (essay_id, created_at desc);
create index if not exists usage_user_kind_time_idx  on public.ai_usage (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists essays_touch_updated_at on public.essays;
create trigger essays_touch_updated_at
  before update on public.essays
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Essays are owned directly (user_id). Everything else is owned transitively
-- through its essay, so each child policy re-checks ownership via a subquery.
-- ---------------------------------------------------------------------------

alter table public.essays                enable row level security;
alter table public.essay_versions        enable row level security;
alter table public.flagged_spots         enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.essay_reports         enable row level security;
alter table public.essay_facts           enable row level security;
alter table public.ai_usage              enable row level security;

drop policy if exists "own essays" on public.essays;
create policy "own essays" on public.essays
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own versions" on public.essay_versions;
create policy "own versions" on public.essay_versions
  for all
  using (exists (select 1 from public.essays e
                  where e.id = essay_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.essays e
                       where e.id = essay_id and e.user_id = auth.uid()));

drop policy if exists "own spots" on public.flagged_spots;
create policy "own spots" on public.flagged_spots
  for all
  using (exists (select 1 from public.essays e
                  where e.id = essay_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.essays e
                       where e.id = essay_id and e.user_id = auth.uid()));

drop policy if exists "own messages" on public.conversation_messages;
create policy "own messages" on public.conversation_messages
  for all
  using (exists (select 1 from public.essays e
                  where e.id = essay_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.essays e
                       where e.id = essay_id and e.user_id = auth.uid()));

drop policy if exists "own reports" on public.essay_reports;
create policy "own reports" on public.essay_reports
  for all
  using (exists (select 1 from public.essays e
                  where e.id = essay_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.essays e
                       where e.id = essay_id and e.user_id = auth.uid()));

drop policy if exists "own facts" on public.essay_facts;
create policy "own facts" on public.essay_facts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own usage" on public.ai_usage;
create policy "own usage" on public.ai_usage
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
