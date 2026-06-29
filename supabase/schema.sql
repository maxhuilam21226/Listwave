-- Listwave schema. Run this in the Supabase SQL editor (or via `supabase db push`).
-- Curated submit-form *guides* live as version-controlled JSON in
-- src/lib/outlets/data and are matched to outlets by hostname at runtime.
--
-- MIGRATION NOTE: submissions.outlet_id changed from a text slug to a uuid FK
-- into the new `outlets` table. If you have an existing DB from before this
-- change, drop the old submissions table first (it holds incompatible text ids):
--     drop table if exists public.submissions;
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
-- outlets: the user's editable list of launch directories (add/edit/remove).
-- Seeded from the bundled starter list on first use (see src/lib/data.ts).
-- ---------------------------------------------------------------------------
create table if not exists public.outlets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  url         text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists outlets_user_idx on public.outlets (user_id);

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

-- ---------------------------------------------------------------------------
-- Row Level Security — every row is scoped to its owner.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.outlets enable row level security;
alter table public.submissions enable row level security;

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
