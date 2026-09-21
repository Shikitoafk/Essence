-- Essence — migration 008: privacy-safe product funnel
--
-- Records small named product events so growth can be measured from first
-- sample through first useful feedback. Essay text is structurally unable to
-- fit: the public function accepts only a small flat JSON object and caps event
-- volume per anonymous browser id.

create table if not exists public.product_events (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users (id) on delete set null,
  anonymous_id uuid not null,
  event_name   text not null check (event_name in (
    'sample_started',
    'sample_completed',
    'referral_landed',
    'auth_started',
    'essay_creation_started',
    'feedback_completed',
    'question_started',
    'question_answered',
    'feedback_rated',
    'feedback_reason',
    'invite_copied'
  )),
  properties   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  constraint product_events_properties_object
    check (jsonb_typeof(properties) = 'object'),
  constraint product_events_properties_small
    check (pg_column_size(properties) <= 2048)
);

create index if not exists product_events_name_time_idx
  on public.product_events (event_name, created_at desc);
create index if not exists product_events_anonymous_time_idx
  on public.product_events (anonymous_id, created_at desc);
create index if not exists product_events_user_time_idx
  on public.product_events (user_id, created_at desc)
  where user_id is not null;

alter table public.product_events enable row level security;

-- There are deliberately no table policies. Browsers can neither read events
-- nor insert arbitrary rows. This narrow function is the only public entry.
revoke all on table public.product_events from anon, authenticated;

create or replace function public.record_product_event(
  p_event_name text,
  p_anonymous_id uuid,
  p_properties jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_name not in (
    'sample_started',
    'sample_completed',
    'referral_landed',
    'auth_started',
    'essay_creation_started',
    'feedback_completed',
    'question_started',
    'question_answered',
    'feedback_rated',
    'feedback_reason',
    'invite_copied'
  ) then
    raise exception 'unknown product event';
  end if;

  if p_properties is null
     or jsonb_typeof(p_properties) <> 'object'
     or pg_column_size(p_properties) > 2048
     or (select count(*) from jsonb_object_keys(p_properties)) > 8
     or exists (
       select 1
       from jsonb_each(p_properties) as item(key, value)
       where item.key !~ '^[a-z][a-z0-9_]{0,39}$'
          or jsonb_typeof(item.value) not in ('string', 'number', 'boolean', 'null')
          or (
            jsonb_typeof(item.value) = 'string'
            and length(item.value #>> '{}') > 500
          )
     ) then
    raise exception 'invalid product event properties';
  end if;

  -- Enough for a real session and too small for a runaway client to grow the
  -- table without bound. Exceeding the cap is a silent analytics miss.
  if (
    select count(*)
    from public.product_events
    where anonymous_id = p_anonymous_id
      and created_at >= now() - interval '1 day'
  ) >= 100 then
    return;
  end if;

  insert into public.product_events (
    user_id,
    anonymous_id,
    event_name,
    properties
  ) values (
    auth.uid(),
    p_anonymous_id,
    p_event_name,
    p_properties
  );
end;
$$;

revoke all on function public.record_product_event(text, uuid, jsonb) from public;
grant execute on function public.record_product_event(text, uuid, jsonb)
  to anon, authenticated;
