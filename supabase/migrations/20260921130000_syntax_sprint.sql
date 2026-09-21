create table if not exists public.profiles (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 16),
  coins integer not null default 450 check (coins >= 0),
  owned jsonb not null default '[]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  admin_until bigint not null default 0
);

create table if not exists public.runs (
  id uuid primary key,
  player uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  level integer not null check (level between 1 and 4),
  started bigint not null,
  ended bigint,
  duration integer check (duration is null or duration >= 0),
  status text not null default 'playing' check (status in ('playing', 'won', 'lost', 'abandoned')),
  correct integer not null default 0 check (correct >= 0),
  loadout jsonb not null,
  admin boolean not null default false
);

create index if not exists idx_runs_level_ended on public.runs(level, ended);
create index if not exists idx_runs_rankings on public.runs(level, status, admin, correct, duration, ended);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.runs from anon, authenticated;
grant all on public.profiles to service_role;
grant all on public.runs to service_role;

create or replace function public.syntax_open_chest(
  p_profile uuid,
  p_expected_owned jsonb,
  p_new_owned jsonb,
  p_cost integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.profiles
  set coins = coins - p_cost,
      owned = p_new_owned
  where id = p_profile
    and owned = p_expected_owned
    and p_cost >= 0
    and coins >= p_cost;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.syntax_finish_run(
  p_run_id uuid,
  p_player uuid,
  p_ended bigint,
  p_duration integer,
  p_correct integer,
  p_status text,
  p_reward integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.runs
  set ended = p_ended,
      duration = p_duration,
      correct = p_correct,
      status = p_status
  where id = p_run_id
    and player = p_player
    and ended is null;
  get diagnostics changed = row_count;
  if changed = 1 and p_reward > 0 then
    update public.profiles set coins = coins + p_reward where id = p_player;
  end if;
  return changed = 1;
end;
$$;

revoke all on function public.syntax_open_chest(uuid, jsonb, jsonb, integer) from public, anon, authenticated;
revoke all on function public.syntax_finish_run(uuid, uuid, bigint, integer, integer, text, integer) from public, anon, authenticated;
grant execute on function public.syntax_open_chest(uuid, jsonb, jsonb, integer) to service_role;
grant execute on function public.syntax_finish_run(uuid, uuid, bigint, integer, integer, text, integer) to service_role;
