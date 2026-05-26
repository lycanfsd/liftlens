create extension if not exists pgcrypto;

create table if not exists public.daily_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  input_snapshot jsonb not null,
  workout_json jsonb not null,
  readiness_score integer,
  training_dose text,
  title text,
  status text not null default 'planned',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_workouts
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.daily_workouts
add column if not exists workout_date date not null default current_date;

alter table public.daily_workouts
add column if not exists input_snapshot jsonb not null default '{}'::jsonb;

alter table public.daily_workouts
add column if not exists workout_json jsonb not null default '{}'::jsonb;

alter table public.daily_workouts
add column if not exists readiness_score integer;

alter table public.daily_workouts
add column if not exists training_dose text;

alter table public.daily_workouts
add column if not exists title text;

alter table public.daily_workouts
add column if not exists status text not null default 'planned';

alter table public.daily_workouts
add column if not exists version integer not null default 1;

alter table public.daily_workouts
add column if not exists created_at timestamptz not null default now();

alter table public.daily_workouts
add column if not exists updated_at timestamptz not null default now();

alter table public.daily_workouts
alter column user_id set not null;

alter table public.daily_workouts
alter column workout_date set not null;

alter table public.daily_workouts
alter column input_snapshot set not null;

alter table public.daily_workouts
alter column workout_json set not null;

alter table public.daily_workouts
alter column status set not null;

alter table public.daily_workouts
alter column version set not null;

alter table public.daily_workouts
alter column created_at set not null;

alter table public.daily_workouts
alter column updated_at set not null;

alter table public.daily_workouts
drop constraint if exists daily_workouts_status_check;

alter table public.daily_workouts
add constraint daily_workouts_status_check
check (
  status in ('planned', 'started', 'completed', 'skipped')
);

alter table public.daily_workouts
drop constraint if exists daily_workouts_readiness_score_check;

alter table public.daily_workouts
add constraint daily_workouts_readiness_score_check
check (
  readiness_score is null
  or readiness_score between 0 and 100
);

alter table public.daily_workouts
drop constraint if exists daily_workouts_version_check;

alter table public.daily_workouts
add constraint daily_workouts_version_check
check (
  version > 0
);

create unique index if not exists daily_workouts_user_date_unique_idx
on public.daily_workouts (user_id, workout_date);

create index if not exists daily_workouts_user_updated_idx
on public.daily_workouts (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_workouts_set_updated_at on public.daily_workouts;
create trigger daily_workouts_set_updated_at
before update on public.daily_workouts
for each row
execute function public.set_updated_at();

alter table public.daily_workouts enable row level security;

drop policy if exists daily_workouts_select_own on public.daily_workouts;
create policy daily_workouts_select_own
on public.daily_workouts
for select
using (
  auth.uid() = user_id
);

drop policy if exists daily_workouts_insert_own on public.daily_workouts;
create policy daily_workouts_insert_own
on public.daily_workouts
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists daily_workouts_update_own on public.daily_workouts;
create policy daily_workouts_update_own
on public.daily_workouts
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists daily_workouts_delete_own on public.daily_workouts;
create policy daily_workouts_delete_own
on public.daily_workouts
for delete
using (
  auth.uid() = user_id
);
