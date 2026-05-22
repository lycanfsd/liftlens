create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  primary_goal text,
  experience_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  primary_goal text not null check (primary_goal in ('lose-fat', 'build-muscle', 'recomposition', 'strength', 'general-health')),
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  weekly_availability integer not null check (weekly_availability between 1 and 7),
  typical_workout_length integer not null check (typical_workout_length between 10 and 120),
  equipment_access text not null check (equipment_access in ('full-gym', 'home-gym', 'dumbbells-only', 'bodyweight')),
  biggest_struggle text not null check (biggest_struggle in ('consistency', 'diet', 'motivation', 'time', 'gym-anxiety', 'not-knowing-what-to-do')),
  weak_points text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_name text not null,
  duration integer not null check (duration between 1 and 180),
  focus text not null,
  intensity text not null check (intensity in ('restore', 'steady', 'push')),
  energy integer not null check (energy between 1 and 5),
  soreness integer not null check (soreness between 1 and 5),
  time_available integer not null check (time_available between 1 and 180),
  equipment text not null,
  gym_crowding text not null check (gym_crowding in ('empty', 'moderate', 'packed')),
  body_focus text not null,
  warmup text[] not null default '{}',
  why_it_fits text[] not null default '{}',
  condensed_version text[] not null default '{}',
  completed_exercises integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_order integer not null,
  name text not null,
  muscle_group text not null,
  equipment text not null,
  sets integer not null,
  reps text not null,
  rest text not null,
  cue text,
  substitution text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  completed_at timestamptz not null default now(),
  duration integer not null,
  focus text not null,
  energy integer not null check (energy between 1 and 5),
  soreness integer not null check (soreness between 1 and 5)
);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists workouts_user_created_idx on public.workouts(user_id, created_at desc);
create index if not exists workout_logs_user_completed_idx on public.workout_logs(user_id, completed_at desc);
create index if not exists workout_exercises_workout_order_idx on public.workout_exercises(workout_id, exercise_order);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists onboarding_answers_set_updated_at on public.onboarding_answers;
create trigger onboarding_answers_set_updated_at
before update on public.onboarding_answers
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.onboarding_answers enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can upsert own profile" on public.profiles;
create policy "Users can upsert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage own onboarding" on public.onboarding_answers;
create policy "Users can manage own onboarding"
on public.onboarding_answers for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own workouts" on public.workouts;
create policy "Users can manage own workouts"
on public.workouts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage exercises for own workouts" on public.workout_exercises;
create policy "Users can manage exercises for own workouts"
on public.workout_exercises for all
using (
  exists (
    select 1 from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workouts
    where workouts.id = workout_exercises.workout_id
      and workouts.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage own workout logs" on public.workout_logs;
create policy "Users can manage own workout logs"
on public.workout_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
