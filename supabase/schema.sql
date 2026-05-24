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

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  full_name text,
  age integer,
  sex text,
  height text,
  weight text,
  training_experience text check (
    training_experience is null
    or training_experience in ('beginner', 'intermediate', 'advanced')
  ),
  primary_goal text check (
    primary_goal is null
    or primary_goal in ('lose-fat', 'build-muscle', 'recomposition', 'strength', 'general-health')
  ),
  experience_level text check (
    experience_level is null
    or experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  weekly_training_days integer check (
    weekly_training_days is null
    or weekly_training_days between 1 and 7
  ),
  preferred_workout_length integer check (
    preferred_workout_length is null
    or preferred_workout_length between 10 and 120
  ),
  equipment_access text check (
    equipment_access is null
    or equipment_access in ('full-gym', 'home-gym', 'dumbbells-only', 'bodyweight')
  ),
  weak_points text[] not null default '{}',
  biggest_struggle text check (
    biggest_struggle is null
    or biggest_struggle in (
      'consistency',
      'diet',
      'motivation',
      'time',
      'gym-anxiety',
      'not-knowing-what-to-do'
    )
  ),
  injury_notes text,
  plan_type text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  primary_goal text not null check (
    primary_goal in ('lose-fat', 'build-muscle', 'recomposition', 'strength', 'general-health')
  ),
  experience_level text not null check (
    experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  weekly_availability integer not null check (
    weekly_availability between 1 and 7
  ),
  typical_workout_length integer not null check (
    typical_workout_length between 10 and 120
  ),
  equipment_access text not null check (
    equipment_access in ('full-gym', 'home-gym', 'dumbbells-only', 'bodyweight')
  ),
  biggest_struggle text not null check (
    biggest_struggle in (
      'consistency',
      'diet',
      'motivation',
      'time',
      'gym-anxiety',
      'not-knowing-what-to-do'
    )
  ),
  weak_points text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_name text not null,
  duration integer not null check (
    duration between 1 and 180
  ),
  focus text not null,
  intensity text not null check (
    intensity in ('restore', 'steady', 'push')
  ),
  energy integer not null check (
    energy between 1 and 5
  ),
  soreness integer not null check (
    soreness between 1 and 5
  ),
  time_available integer not null check (
    time_available between 1 and 180
  ),
  equipment text not null,
  gym_crowding text not null check (
    gym_crowding in ('empty', 'moderate', 'packed')
  ),
  body_focus text not null,
  warmup text[] not null default '{}',
  why_it_fits text[] not null default '{}',
  condensed_version text[] not null default '{}',
  completed_exercises integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  completed_at timestamptz not null default now(),
  duration integer not null check (
    duration between 1 and 180
  ),
  focus text not null,
  energy integer not null check (
    energy between 1 and 5
  ),
  soreness integer not null check (
    soreness between 1 and 5
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_order integer not null,
  name text not null,
  muscle_group text not null,
  equipment text not null,
  sets integer not null check (
    sets > 0
  ),
  reps text not null,
  rest text not null,
  cue text,
  substitution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise text not null check (
    exercise in ('squat', 'deadlift', 'bench-press', 'overhead-press', 'row', 'pull-up', 'lunge')
  ),
  video_url text,
  form_score integer not null check (
    form_score between 0 and 100
  ),
  positives jsonb not null default '[]'::jsonb,
  corrections jsonb not null default '[]'::jsonb,
  safety_warnings jsonb not null default '[]'::jsonb,
  next_cues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Required exact Supabase Storage bucket name for AI Form Coach videos: form-videos.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'form-videos',
  'form-videos',
  false,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles
drop constraint if exists profiles_id_matches_user_id;

alter table public.profiles
drop constraint if exists profiles_id_fkey;

alter table public.profiles
alter column id set default gen_random_uuid();

alter table public.profiles
add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.profiles
set user_id = id
where user_id is null
  and exists (
    select 1
    from auth.users
    where auth.users.id = public.profiles.id
  );

alter table public.profiles
alter column user_id set not null;

-- Keep every public.profiles column used by Profile, onboarding sync, and auth signup in one migration block.
alter table public.profiles
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists full_name text,
  add column if not exists age integer,
  add column if not exists sex text,
  add column if not exists height text,
  add column if not exists weight text,
  add column if not exists training_experience text,
  add column if not exists primary_goal text,
  add column if not exists experience_level text,
  add column if not exists weekly_training_days integer,
  add column if not exists preferred_workout_length integer,
  add column if not exists equipment_access text,
  add column if not exists weak_points text[] not null default '{}',
  add column if not exists biggest_struggle text,
  add column if not exists injury_notes text,
  add column if not exists plan_type text not null default 'free',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.onboarding_answers
add column if not exists updated_at timestamptz not null default now();

alter table public.workouts
add column if not exists updated_at timestamptz not null default now();

alter table public.workout_logs
add column if not exists created_at timestamptz not null default now();

alter table public.workout_logs
add column if not exists updated_at timestamptz not null default now();

alter table public.workout_exercises
add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.workout_exercises
set user_id = public.workouts.user_id
from public.workouts
where public.workout_exercises.workout_id = public.workouts.id
  and public.workout_exercises.user_id is null;

alter table public.workout_exercises
alter column user_id set not null;

alter table public.workout_exercises
add column if not exists updated_at timestamptz not null default now();

alter table public.form_checks
add column if not exists video_url text;

alter table public.form_checks
add column if not exists positives jsonb not null default '[]'::jsonb;

alter table public.form_checks
add column if not exists corrections jsonb not null default '[]'::jsonb;

alter table public.form_checks
add column if not exists safety_warnings jsonb not null default '[]'::jsonb;

alter table public.form_checks
add column if not exists next_cues jsonb not null default '[]'::jsonb;

update public.profiles
set display_name = coalesce(display_name, full_name)
where display_name is null
  and full_name is not null;

update public.profiles
set training_experience = coalesce(training_experience, experience_level)
where training_experience is null
  and experience_level is not null;

create unique index if not exists profiles_user_id_unique_idx
on public.profiles (user_id);

create unique index if not exists onboarding_answers_user_id_unique_idx
on public.onboarding_answers (user_id);

create index if not exists profiles_user_id_idx
on public.profiles (user_id);

create index if not exists profiles_email_idx
on public.profiles (email);

create index if not exists onboarding_answers_user_id_idx
on public.onboarding_answers (user_id);

create index if not exists workouts_user_created_idx
on public.workouts (user_id, created_at desc);

create index if not exists workout_logs_user_completed_idx
on public.workout_logs (user_id, completed_at desc);

create index if not exists workout_exercises_user_id_idx
on public.workout_exercises (user_id);

create index if not exists workout_exercises_workout_order_idx
on public.workout_exercises (workout_id, exercise_order);

create index if not exists form_checks_user_created_idx
on public.form_checks (user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists onboarding_answers_set_updated_at on public.onboarding_answers;
create trigger onboarding_answers_set_updated_at
before update on public.onboarding_answers
for each row
execute function public.set_updated_at();

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
before update on public.workouts
for each row
execute function public.set_updated_at();

drop trigger if exists workout_logs_set_updated_at on public.workout_logs;
create trigger workout_logs_set_updated_at
before update on public.workout_logs
for each row
execute function public.set_updated_at();

drop trigger if exists workout_exercises_set_updated_at on public.workout_exercises;
create trigger workout_exercises_set_updated_at
before update on public.workout_exercises
for each row
execute function public.set_updated_at();

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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  user_id,
  email
)
select
  auth.users.id,
  auth.users.email
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.onboarding_answers enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.form_checks enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (
  auth.uid() = user_id
);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own
on public.profiles
for delete
using (
  auth.uid() = user_id
);

drop policy if exists onboarding_answers_select_own on public.onboarding_answers;
create policy onboarding_answers_select_own
on public.onboarding_answers
for select
using (
  auth.uid() = user_id
);

drop policy if exists onboarding_answers_insert_own on public.onboarding_answers;
create policy onboarding_answers_insert_own
on public.onboarding_answers
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists onboarding_answers_update_own on public.onboarding_answers;
create policy onboarding_answers_update_own
on public.onboarding_answers
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists onboarding_answers_delete_own on public.onboarding_answers;
create policy onboarding_answers_delete_own
on public.onboarding_answers
for delete
using (
  auth.uid() = user_id
);

drop policy if exists workouts_select_own on public.workouts;
create policy workouts_select_own
on public.workouts
for select
using (
  auth.uid() = user_id
);

drop policy if exists workouts_insert_own on public.workouts;
create policy workouts_insert_own
on public.workouts
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists workouts_update_own on public.workouts;
create policy workouts_update_own
on public.workouts
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_delete_own
on public.workouts
for delete
using (
  auth.uid() = user_id
);

drop policy if exists workout_logs_select_own on public.workout_logs;
create policy workout_logs_select_own
on public.workout_logs
for select
using (
  auth.uid() = user_id
);

drop policy if exists workout_logs_insert_own on public.workout_logs;
create policy workout_logs_insert_own
on public.workout_logs
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists workout_logs_update_own on public.workout_logs;
create policy workout_logs_update_own
on public.workout_logs
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists workout_logs_delete_own on public.workout_logs;
create policy workout_logs_delete_own
on public.workout_logs
for delete
using (
  auth.uid() = user_id
);

drop policy if exists workout_exercises_select_own on public.workout_exercises;
create policy workout_exercises_select_own
on public.workout_exercises
for select
using (
  auth.uid() = user_id
);

drop policy if exists workout_exercises_insert_own on public.workout_exercises;
create policy workout_exercises_insert_own
on public.workout_exercises
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.workouts
    where public.workouts.id = workout_id
      and public.workouts.user_id = auth.uid()
  )
);

drop policy if exists workout_exercises_update_own on public.workout_exercises;
create policy workout_exercises_update_own
on public.workout_exercises
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.workouts
    where public.workouts.id = workout_id
      and public.workouts.user_id = auth.uid()
  )
);

drop policy if exists workout_exercises_delete_own on public.workout_exercises;
create policy workout_exercises_delete_own
on public.workout_exercises
for delete
using (
  auth.uid() = user_id
);

drop policy if exists form_checks_select_own on public.form_checks;
create policy form_checks_select_own
on public.form_checks
for select
using (
  auth.uid() = user_id
);

drop policy if exists form_checks_insert_own on public.form_checks;
create policy form_checks_insert_own
on public.form_checks
for insert
with check (
  auth.uid() = user_id
  and (
    video_url is null
    or video_url like auth.uid()::text || '/%'
  )
);

drop policy if exists form_checks_update_own on public.form_checks;
create policy form_checks_update_own
on public.form_checks
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
  and (
    video_url is null
    or video_url like auth.uid()::text || '/%'
  )
);

drop policy if exists form_checks_delete_own on public.form_checks;
create policy form_checks_delete_own
on public.form_checks
for delete
using (
  auth.uid() = user_id
);

drop policy if exists form_videos_select_own on storage.objects;
create policy form_videos_select_own
on storage.objects
for select
using (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists form_videos_insert_own on storage.objects;
create policy form_videos_insert_own
on storage.objects
for insert
with check (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists form_videos_update_own on storage.objects;
create policy form_videos_update_own
on storage.objects
for update
using (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists form_videos_delete_own on storage.objects;
create policy form_videos_delete_own
on storage.objects
for delete
using (
  bucket_id = 'form-videos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
