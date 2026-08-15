-- ============================================================
-- SmartNest V1 — Supabase Schema
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
  state boolean not null default false,
  desired_state boolean not null default false,
  watts numeric not null default 0,
  timer_at timestamptz,
  updated_at timestamptz default now()
);

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

-- ── Row Level Security ───────────────────────────────────────
alter table profiles  enable row level security;
alter table modules   enable row level security;
alter table readings  enable row level security;
alter table alerts    enable row level security;

create policy "read modules"      on modules   for select to authenticated using (true);
create policy "read readings"     on readings  for select to authenticated using (true);
create policy "read alerts"       on alerts    for select to authenticated using (true);
create policy "read own profile"  on profiles  for select to authenticated using (true);

create policy "toggle modules" on modules for update to authenticated using (true);

create policy "admin insert modules" on modules for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin delete modules" on modules for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin manage profiles" on profiles for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

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

-- ── Seed demo modules ────────────────────────────────────────
insert into modules (id, name, type, state, desired_state, watts) values
  ('living-room-light', 'Living Room Light', 'bulb',   false, false, 0),
  ('bedroom-fan',       'Bedroom Fan',       'fan',    false, false, 0),
  ('kitchen-outlet',    'Kitchen Outlet',    'outlet', false, false, 0),
  ('office-light',      'Office Light',      'bulb',   false, false, 0),
  ('bathroom-fan',      'Bathroom Fan',      'fan',    false, false, 0)
on conflict (id) do nothing;

-- ============================================================
-- After your FIRST signup, promote yourself to admin:
--   update profiles set role = 'admin' where id = '<your-uuid>';
-- ============================================================
