-- Essence — migration 009: one real anonymous trial
--
-- Keeps the public demo useful without letting anonymous traffic consume the
-- shared model quota. Only keyed hashes are stored; never an IP, draft, prompt
-- or model response. Old claims are removed automatically.

create table if not exists public.anonymous_trial_usage (
  id           uuid primary key default gen_random_uuid(),
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  network_hash text not null check (network_hash ~ '^[0-9a-f]{64}$'),
  status       text not null default 'claimed'
                 check (status in ('claimed', 'completed')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists trial_visitor_time_idx
  on public.anonymous_trial_usage (visitor_hash, created_at desc);
create index if not exists trial_network_time_idx
  on public.anonymous_trial_usage (network_hash, created_at desc);

alter table public.anonymous_trial_usage enable row level security;
revoke all on table public.anonymous_trial_usage from anon, authenticated;

create or replace function public.claim_anonymous_trial(
  p_visitor_hash text,
  p_network_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_id uuid;
begin
  if p_visitor_hash !~ '^[0-9a-f]{64}$'
     or p_network_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid trial identity';
  end if;

  -- Serialize claims from one browser so two rapid clicks cannot spend twice.
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_hash, 0));

  delete from public.anonymous_trial_usage
  where created_at < now() - interval '7 days';

  if exists (
    select 1 from public.anonymous_trial_usage
    where visitor_hash = p_visitor_hash
      and (
        (status = 'completed' and completed_at >= now() - interval '24 hours')
        or (status = 'claimed' and created_at >= now() - interval '10 minutes')
      )
  ) then
    return null;
  end if;

  -- Shared school/home networks still get several trials, while automated
  -- traffic cannot drain hundreds of free calls from one address.
  if (
    select count(*) from public.anonymous_trial_usage
    where network_hash = p_network_hash
      and created_at >= now() - interval '24 hours'
      and (
        status = 'completed'
        or (status = 'claimed' and created_at >= now() - interval '10 minutes')
      )
  ) >= 5 then
    return null;
  end if;

  insert into public.anonymous_trial_usage (visitor_hash, network_hash)
  values (p_visitor_hash, p_network_hash)
  returning id into claim_id;

  return claim_id;
end;
$$;

create or replace function public.complete_anonymous_trial(p_claim_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.anonymous_trial_usage
  set status = 'completed', completed_at = now()
  where id = p_claim_id and status = 'claimed';
$$;

create or replace function public.release_anonymous_trial(p_claim_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.anonymous_trial_usage
  where id = p_claim_id and status = 'claimed';
$$;

revoke all on function public.claim_anonymous_trial(text, text) from public;
revoke all on function public.complete_anonymous_trial(uuid) from public;
revoke all on function public.release_anonymous_trial(uuid) from public;
grant execute on function public.claim_anonymous_trial(text, text)
  to anon, authenticated;
grant execute on function public.complete_anonymous_trial(uuid)
  to anon, authenticated;
grant execute on function public.release_anonymous_trial(uuid)
  to anon, authenticated;
