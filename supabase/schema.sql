-- ============================================================
-- SmartNest V1 - Supabase Schema
-- Run this in the Supabase SQL editor on a fresh project.
-- ============================================================

-- ── Profiles (1:1 with auth.users) ──────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Home Owner',
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz default now()
);

-- ── Modules (one row per physical ESP8266 module) ────────────
create table if not exists modules (
  id text primary key,
  name text not null,
  type text not null default 'outlet'
    check (type in ('bulb','fan','outlet')),
  owner_id uuid not null references profiles(id) on delete cascade,
  state boolean not null default false,
  desired_state boolean not null default false,
  watts numeric not null default 0,
  timer_at timestamptz,
  updated_at timestamptz default now()
);

-- Ensure the column exists if the table was already created before
alter table modules add column if not exists owner_id uuid references profiles(id) on delete cascade;

-- ── Readings ─────────────────────────────────────────────────
create table if not exists readings (
  id bigint generated always as identity primary key,
  module_id text references modules(id) on delete cascade,
  watts numeric not null,
  at timestamptz default now()
);

-- ── Alerts ──────────────────────────────────────────────────
create table if not exists alerts (
  id bigint generated always as identity primary key,
  module_id text references modules(id) on delete set null,
  module_name text,
  type text not null default 'spike',
  message text not null,
  at timestamptz default now()
);

-- ── Hub Status ───────────────────────────────────────────────
create table if not exists hub_status (
  id text primary key default 'main',
  status text not null default 'offline',
  updated_at timestamptz default now()
);

insert into hub_status (id, status) values ('main', 'offline') on conflict do nothing;

-- ── Row Level Security ───────────────────────────────────────
alter table profiles  enable row level security;
alter table modules   enable row level security;
alter table readings  enable row level security;
alter table alerts    enable row level security;
alter table hub_status enable row level security;

drop policy if exists "read own profile" on profiles;
create policy "read own profile"  on profiles  for select to authenticated using (true);

drop policy if exists "select own or admin modules" on modules;
-- SELECT: owner sees their own modules; admin sees all
create policy "select own or admin modules" on modules for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "update own or admin modules" on modules;
drop policy if exists "update own only" on modules;
drop policy if exists "toggle modules" on modules;
drop policy if exists "update strictly own" on modules;
-- UPDATE: owner-only. No role check bypasses this. Full stop.
create policy "update strictly own" on modules for update to authenticated
  using (owner_id = auth.uid());

drop policy if exists "insert own or admin modules" on modules;
-- INSERT: owners can insert their own modules; admin can insert any
create policy "insert own or admin modules" on modules for insert to authenticated
  with check (
    owner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "delete own or admin modules" on modules;
-- DELETE: owners can delete their own modules; admin can delete any
create policy "delete own or admin modules" on modules for delete to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "read own readings or admin" on readings;
-- READINGS & ALERTS: isolated by module ownership, admin sees all
create policy "read own readings or admin" on readings for select to authenticated
  using (
    exists (
      select 1 from modules m 
      where m.id = readings.module_id 
      and (m.owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

drop policy if exists "read own alerts or admin" on alerts;
create policy "read own alerts or admin" on alerts for select to authenticated
  using (
    exists (
      select 1 from modules m 
      where m.id = alerts.module_id 
      and (m.owner_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

drop policy if exists "admin manage profiles" on profiles;
create policy "admin manage profiles" on profiles for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "read hub_status" on hub_status;
create policy "read hub_status" on hub_status for select to authenticated using (true);

-- ── Auto-create profile on signup ────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Home Owner')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Seed demo modules (Requires a valid owner_id to run now, commented out by default)
-- insert into modules (id, name, type, owner_id, state, desired_state, watts) values
--   ('living-room-light', 'Living Room Light', 'bulb',   '<uuid>', false, false, 0),
--   ('bedroom-fan',       'Bedroom Fan',       'fan',    '<uuid>', false, false, 0),
--   ('kitchen-outlet',    'Kitchen Outlet',    'outlet', '<uuid>', false, false, 0),
--   ('office-light',      'Office Light',      'bulb',   '<uuid>', false, false, 0),
--   ('bathroom-fan',      'Bathroom Fan',      'fan',    '<uuid>', false, false, 0)
-- on conflict (id) do nothing;

-- ============================================================
-- After your FIRST signup, promote yourself to admin:
--   update profiles set role = 'admin' where id = '<your-uuid>';
-- ============================================================
