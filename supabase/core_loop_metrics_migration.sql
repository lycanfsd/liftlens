create table if not exists public.pr_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lift text not null check (
    lift in ('Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-Up / Lat Pulldown')
  ),
  date date not null,
  one_rep_max numeric(7, 1) not null check (one_rep_max > 0),
  unit text not null default 'lb' check (unit in ('lb', 'kg')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pr_history_user_lift_date_unique unique (user_id, lift, date)
);

alter table public.pr_history
drop constraint if exists pr_history_user_lift_date_unit_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pr_history_user_lift_date_unique'
      and conrelid = 'public.pr_history'::regclass
  ) then
    alter table public.pr_history
    add constraint pr_history_user_lift_date_unique unique (user_id, lift, date);
  end if;
end;
$$;

create table if not exists public.physique_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric(7, 1),
  waist numeric(7, 1),
  chest numeric(7, 1),
  shoulders numeric(7, 1),
  arms numeric(7, 1),
  thighs numeric(7, 1),
  hips_glutes numeric(7, 1),
  body_fat numeric(5, 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physique_measurements_user_date_unique unique (user_id, date)
);

create table if not exists public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_hours numeric(4, 1) not null check (sleep_hours between 0 and 14),
  energy integer not null check (energy between 1 and 10),
  soreness integer not null check (soreness between 1 and 10),
  stress integer not null check (stress between 1 and 10),
  workout_rpe integer not null check (workout_rpe between 1 and 10),
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recovery_logs_user_date_unique unique (user_id, date)
);

create index if not exists pr_history_user_lift_date_idx
on public.pr_history (user_id, lift, date desc);

create index if not exists physique_measurements_user_date_idx
on public.physique_measurements (user_id, date desc);

create index if not exists recovery_logs_user_date_idx
on public.recovery_logs (user_id, date desc);

drop trigger if exists pr_history_set_updated_at on public.pr_history;
create trigger pr_history_set_updated_at
before update on public.pr_history
for each row
execute function public.set_updated_at();

drop trigger if exists physique_measurements_set_updated_at on public.physique_measurements;
create trigger physique_measurements_set_updated_at
before update on public.physique_measurements
for each row
execute function public.set_updated_at();

drop trigger if exists recovery_logs_set_updated_at on public.recovery_logs;
create trigger recovery_logs_set_updated_at
before update on public.recovery_logs
for each row
execute function public.set_updated_at();

alter table public.pr_history enable row level security;
alter table public.physique_measurements enable row level security;
alter table public.recovery_logs enable row level security;

drop policy if exists pr_history_select_own on public.pr_history;
create policy pr_history_select_own on public.pr_history
for select using (auth.uid() = user_id);

drop policy if exists pr_history_insert_own on public.pr_history;
create policy pr_history_insert_own on public.pr_history
for insert with check (auth.uid() = user_id);

drop policy if exists pr_history_update_own on public.pr_history;
create policy pr_history_update_own on public.pr_history
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists pr_history_delete_own on public.pr_history;
create policy pr_history_delete_own on public.pr_history
for delete using (auth.uid() = user_id);

drop policy if exists physique_measurements_select_own on public.physique_measurements;
create policy physique_measurements_select_own on public.physique_measurements
for select using (auth.uid() = user_id);

drop policy if exists physique_measurements_insert_own on public.physique_measurements;
create policy physique_measurements_insert_own on public.physique_measurements
for insert with check (auth.uid() = user_id);

drop policy if exists physique_measurements_update_own on public.physique_measurements;
create policy physique_measurements_update_own on public.physique_measurements
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists physique_measurements_delete_own on public.physique_measurements;
create policy physique_measurements_delete_own on public.physique_measurements
for delete using (auth.uid() = user_id);

drop policy if exists recovery_logs_select_own on public.recovery_logs;
create policy recovery_logs_select_own on public.recovery_logs
for select using (auth.uid() = user_id);

drop policy if exists recovery_logs_insert_own on public.recovery_logs;
create policy recovery_logs_insert_own on public.recovery_logs
for insert with check (auth.uid() = user_id);

drop policy if exists recovery_logs_update_own on public.recovery_logs;
create policy recovery_logs_update_own on public.recovery_logs
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists recovery_logs_delete_own on public.recovery_logs;
create policy recovery_logs_delete_own on public.recovery_logs
for delete using (auth.uid() = user_id);
