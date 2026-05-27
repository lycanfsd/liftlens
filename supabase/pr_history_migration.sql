create extension if not exists pgcrypto;

create table if not exists public.pr_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lift text not null,
  date date not null,
  one_rep_max numeric not null,
  unit text not null default 'lb',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pr_history_user_lift_date_unique unique (user_id, lift, date)
);

alter table public.pr_history
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists lift text,
  add column if not exists date date,
  add column if not exists one_rep_max numeric,
  add column if not exists unit text not null default 'lb',
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.pr_history
alter column user_id set not null;

alter table public.pr_history
alter column lift set not null;

alter table public.pr_history
alter column date set not null;

alter table public.pr_history
alter column one_rep_max set not null;

alter table public.pr_history
alter column unit set default 'lb';

alter table public.pr_history
alter column unit set not null;

alter table public.pr_history
drop constraint if exists pr_history_one_rep_max_check;

alter table public.pr_history
add constraint pr_history_one_rep_max_check
check (one_rep_max > 0);

alter table public.pr_history
drop constraint if exists pr_history_unit_check;

alter table public.pr_history
add constraint pr_history_unit_check
check (unit in ('lb', 'kg'));

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

create index if not exists pr_history_user_lift_date_idx
on public.pr_history (user_id, lift, date desc);

alter table public.pr_history enable row level security;

drop policy if exists pr_history_select_own on public.pr_history;
drop policy if exists "Users can view their own PR history" on public.pr_history;
create policy "Users can view their own PR history"
on public.pr_history
for select
using (
  auth.uid() = user_id
);

drop policy if exists pr_history_insert_own on public.pr_history;
drop policy if exists "Users can insert their own PR history" on public.pr_history;
create policy "Users can insert their own PR history"
on public.pr_history
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists pr_history_update_own on public.pr_history;
drop policy if exists "Users can update their own PR history" on public.pr_history;
create policy "Users can update their own PR history"
on public.pr_history
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists pr_history_delete_own on public.pr_history;
drop policy if exists "Users can delete their own PR history" on public.pr_history;
create policy "Users can delete their own PR history"
on public.pr_history
for delete
using (
  auth.uid() = user_id
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_pr_history_updated_at on public.pr_history;
drop trigger if exists pr_history_set_updated_at on public.pr_history;

create trigger set_pr_history_updated_at
before update on public.pr_history
for each row
execute function public.set_updated_at();
