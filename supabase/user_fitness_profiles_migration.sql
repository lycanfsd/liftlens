create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_fitness_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  primary_goal text check (
    primary_goal is null
    or primary_goal in ('lose-fat', 'build-muscle', 'recomposition', 'strength', 'general-health', 'athletic-performance')
  ),
  physique_focus text[] not null default '{}',
  experience_level text check (
    experience_level is null
    or experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  training_days_per_week integer check (
    training_days_per_week is null
    or training_days_per_week between 2 and 6
  ),
  preferred_workout_length text check (
    preferred_workout_length is null
    or preferred_workout_length in ('30', '45', '60', '75-plus')
  ),
  equipment text[] not null default '{}',
  weak_points text[] not null default '{}',
  adjust_for_soreness boolean not null default true,
  adjust_for_energy boolean not null default true,
  adjust_for_time boolean not null default true,
  beginner_explanations boolean not null default false,
  emphasize_progress_analytics boolean not null default true,
  onboarding_completed boolean not null default false,
  onboarding_skipped boolean not null default false,
  tutorial_completed boolean not null default false,
  checklist_progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_fitness_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists primary_goal text,
  add column if not exists physique_focus text[] not null default '{}',
  add column if not exists experience_level text,
  add column if not exists training_days_per_week integer,
  add column if not exists preferred_workout_length text,
  add column if not exists equipment text[] not null default '{}',
  add column if not exists weak_points text[] not null default '{}',
  add column if not exists adjust_for_soreness boolean not null default true,
  add column if not exists adjust_for_energy boolean not null default true,
  add column if not exists adjust_for_time boolean not null default true,
  add column if not exists beginner_explanations boolean not null default false,
  add column if not exists emphasize_progress_analytics boolean not null default true,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_skipped boolean not null default false,
  add column if not exists tutorial_completed boolean not null default false,
  add column if not exists checklist_progress jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists user_fitness_profiles_user_id_unique_idx
on public.user_fitness_profiles (user_id);

create index if not exists user_fitness_profiles_user_id_idx
on public.user_fitness_profiles (user_id);

drop trigger if exists user_fitness_profiles_set_updated_at on public.user_fitness_profiles;
create trigger user_fitness_profiles_set_updated_at
before update on public.user_fitness_profiles
for each row
execute function public.set_updated_at();

insert into public.user_fitness_profiles (
  user_id
)
select
  auth.users.id
from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    display_name,
    full_name
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    updated_at = now();

  insert into public.user_fitness_profiles (
    user_id
  )
  values (
    new.id
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.user_fitness_profiles enable row level security;

drop policy if exists user_fitness_profiles_select_own on public.user_fitness_profiles;
create policy user_fitness_profiles_select_own
on public.user_fitness_profiles
for select
using (
  auth.uid() = user_id
);

drop policy if exists user_fitness_profiles_insert_own on public.user_fitness_profiles;
create policy user_fitness_profiles_insert_own
on public.user_fitness_profiles
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists user_fitness_profiles_update_own on public.user_fitness_profiles;
create policy user_fitness_profiles_update_own
on public.user_fitness_profiles
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists user_fitness_profiles_delete_own on public.user_fitness_profiles;
create policy user_fitness_profiles_delete_own
on public.user_fitness_profiles
for delete
using (
  auth.uid() = user_id
);
