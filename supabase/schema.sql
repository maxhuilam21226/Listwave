-- Listwave schema. Run this in the Supabase SQL editor (or via `supabase db push`).
-- Curated submit-form *guides* live as version-controlled JSON in
-- src/lib/outlets/data and are matched to outlets by hostname at runtime.
--
-- MIGRATION NOTE: outlets are now split into a per-user MASTER template
-- (project_id is null) and per-PROJECT copies (project_id set). A new project
-- inherits a copy of the master list; editing/removing within a project never
-- touches the master or other projects. submissions.outlet_id is a uuid FK into
-- `outlets`. If you have an existing DB from before these changes, drop the old
-- tables first (they hold an incompatible shape):
--     drop table if exists public.submissions;
--     drop table if exists public.outlets;
-- then run this file. No production data exists yet, so this is safe.

-- ---------------------------------------------------------------------------
-- projects: a project's launch kit, entered once and reused per launch.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  url           text not null default '',
  one_liner     text not null default '',
  tagline       text not null default '',
  short_desc    text not null default '',
  long_desc     text not null default '',
  tags          text[] not null default '{}',
  pricing_type  text not null default 'freemium',
  contact_email text not null default '',
  logo_url      text,
  screenshot_urls text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- outlets: editable launch directories. project_id is null for the user's
-- MASTER template (seeded from the bundled list on first use, see
-- src/lib/data.ts); a non-null project_id marks a copy owned by that one
-- project. sort_order drives manual drag-ordering within a list.
--
-- cost flags whether submitting to the outlet costs money ('free' | 'paid'),
-- adjustable per-outlet in-app. If migrating an older DB without dropping the
-- table, add the column with:
--     alter table public.outlets
--       add column if not exists cost text not null default 'free'
--         check (cost in ('free','paid'));
--
-- field_overrides is a per-outlet copy-on-write map of submit-form field key ->
-- the user's literal text for THIS outlet. A missing key means "inherit the
-- value computed from the project kit"; once a key is present that field is
-- frozen and later kit edits no longer flow into it (until reset). If migrating
-- an older DB without dropping the table, add the column with:
--     alter table public.outlets
--       add column if not exists field_overrides jsonb not null default '{}'::jsonb;
--
-- master_outlet_id links a project copy back to the master row it was copied
-- from (null on master rows themselves, and on copies whose master was since
-- deleted). It lets a master edit propagate to exactly its copies. If migrating
-- an older DB, add the column and backfill existing copies by URL:
--     alter table public.outlets
--       add column if not exists master_outlet_id uuid
--         references public.outlets (id) on delete set null;
--     update public.outlets c
--        set master_outlet_id = m.id
--       from public.outlets m
--      where c.project_id is not null
--        and c.master_outlet_id is null
--        and m.project_id is null
--        and m.user_id = c.user_id
--        and m.url = c.url;
-- ---------------------------------------------------------------------------
create table if not exists public.outlets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  project_id  uuid references public.projects (id) on delete cascade,
  master_outlet_id uuid references public.outlets (id) on delete set null,
  name        text not null,
  url         text not null,
  description text not null default '',
  cost        text not null default 'free' check (cost in ('free','paid')),
  sort_order  double precision not null default 0,
  field_overrides jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists outlets_user_project_idx
  on public.outlets (user_id, project_id);

create index if not exists outlets_master_idx
  on public.outlets (master_outlet_id);

-- ---------------------------------------------------------------------------
-- submissions: progress for one project at one outlet.
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  outlet_id    uuid not null references public.outlets (id) on delete cascade,
  status       text not null default 'todo' check (status in ('todo','submitted','skipped')),
  submitted_at timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, outlet_id)
);

create index if not exists submissions_project_idx on public.submissions (project_id);

-- ---------------------------------------------------------------------------
-- profiles: one row per user for cross-device UI preferences (the chosen theme
-- family + light/dark mode). theme_mode is nullable — null means "follow the OS
-- setting". If migrating an existing DB, just run this whole block; it is
-- additive (no drops needed).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  theme_family text not null default 'aurora'
                 check (theme_family in ('aurora','editorial','mission','clay')),
  theme_mode   text check (theme_mode in ('light','dark')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists outlets_set_updated_at on public.outlets;
create trigger outlets_set_updated_at before update on public.outlets
  for each row execute function public.set_updated_at();

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every row is scoped to its owner.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.outlets enable row level security;
alter table public.submissions enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own outlets" on public.outlets;
create policy "own outlets" on public.outlets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own submissions" on public.submissions;
create policy "own submissions" on public.submissions
  for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage bucket for logos + screenshots.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

drop policy if exists "assets read" on storage.objects;
create policy "assets read" on storage.objects
  for select using (bucket_id = 'assets');

drop policy if exists "assets write own" on storage.objects;
create policy "assets write own" on storage.objects
  for insert with check (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "assets update own" on storage.objects;
create policy "assets update own" on storage.objects
  for update using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "assets delete own" on storage.objects;
create policy "assets delete own" on storage.objects
  for delete using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
