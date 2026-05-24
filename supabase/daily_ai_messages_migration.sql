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

create table if not exists public.daily_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_date date not null,
  content text not null,
  source text not null default 'fake',
  plan_type text,
  dismissed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_ai_messages
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid,
  add column if not exists message_date date,
  add column if not exists content text,
  add column if not exists source text default 'fake',
  add column if not exists plan_type text,
  add column if not exists dismissed_at timestamptz,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_ai_messages'
      and column_name = 'message'
  ) then
    execute 'update public.daily_ai_messages set content = coalesce(content, message) where content is null';
  end if;
end;
$$;

update public.daily_ai_messages
set
  id = coalesce(id, gen_random_uuid()),
  message_date = coalesce(message_date, created_at::date, current_date),
  content = coalesce(content, 'Today''s coach message is ready.'),
  source = coalesce(source, 'fake'),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

update public.daily_ai_messages
set source = 'fallback'
where source not in ('fake', 'openai', 'fallback');

do $$
begin
  if to_regclass('public.daily_coach_messages') is not null then
    insert into public.daily_ai_messages (
      id,
      user_id,
      message_date,
      content,
      source,
      plan_type,
      dismissed_at,
      metadata,
      created_at,
      updated_at
    )
    select
      id,
      user_id,
      message_date,
      content,
      source,
      plan_type,
      dismissed_at,
      metadata,
      created_at,
      updated_at
    from public.daily_coach_messages legacy
    where not exists (
      select 1
      from public.daily_ai_messages current_messages
      where current_messages.user_id = legacy.user_id
        and current_messages.message_date = legacy.message_date
    );
  end if;
end;
$$;

alter table public.daily_ai_messages
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column message_date set not null,
  alter column content set not null,
  alter column source set default 'fake',
  alter column source set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.daily_ai_messages'::regclass
      and contype = 'p'
  ) then
    alter table public.daily_ai_messages
    add constraint daily_ai_messages_pkey primary key (id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.daily_ai_messages'::regclass
      and conname = 'daily_ai_messages_user_id_fkey'
  ) then
    alter table public.daily_ai_messages
    add constraint daily_ai_messages_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.daily_ai_messages'::regclass
      and conname = 'daily_ai_messages_source_check'
  ) then
    alter table public.daily_ai_messages
    add constraint daily_ai_messages_source_check
    check (source in ('fake', 'openai', 'fallback'));
  end if;
end;
$$;

create unique index if not exists daily_ai_messages_user_date_unique_idx
on public.daily_ai_messages (user_id, message_date);

create index if not exists daily_ai_messages_user_date_idx
on public.daily_ai_messages (user_id, message_date desc);

drop trigger if exists daily_ai_messages_set_updated_at on public.daily_ai_messages;
create trigger daily_ai_messages_set_updated_at
before update on public.daily_ai_messages
for each row
execute function public.set_updated_at();

alter table public.daily_ai_messages enable row level security;

drop policy if exists daily_ai_messages_select_own on public.daily_ai_messages;
create policy daily_ai_messages_select_own
on public.daily_ai_messages
for select
using (
  auth.uid() = user_id
);

drop policy if exists daily_ai_messages_insert_own on public.daily_ai_messages;
create policy daily_ai_messages_insert_own
on public.daily_ai_messages
for insert
with check (
  auth.uid() = user_id
);

drop policy if exists daily_ai_messages_update_own on public.daily_ai_messages;
create policy daily_ai_messages_update_own
on public.daily_ai_messages
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists daily_ai_messages_delete_own on public.daily_ai_messages;
create policy daily_ai_messages_delete_own
on public.daily_ai_messages
for delete
using (
  auth.uid() = user_id
);
