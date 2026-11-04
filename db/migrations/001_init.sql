-- Schema for the self-hosted (AWS RDS) database. Replaces the Supabase schema in
-- drizzle/migrations; access rules that used to live in RLS policies are now
-- enforced by the server functions in src/lib/*.functions.ts.

create type app_role as enum ('admin', 'official', 'vertical_head');

create table verticals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text,
  role app_role not null,
  vertical_id uuid references verticals(id) on delete set null,
  -- Set for accounts created by the admin or imported from Supabase, so the
  -- person picks their own password on first sign-in.
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table sessions (
  -- sha256 of the cookie token; the raw token is never stored.
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

create table projects (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references verticals(id) on delete restrict,
  name text not null,
  project_head text,
  team_members text,
  start_date date,
  end_date date,
  status text not null default 'Ongoing',
  progress_notes text,
  physical_progress numeric not null default 0,
  physical_progress_not_applicable boolean not null default false,
  milestones_completed text,
  milestones_pending text,
  total_cost numeric not null default 0,
  amount_received numeric not null default 0,
  expenditure numeric not null default 0,
  amount_receivable numeric not null default 0,
  expected_completion date,
  issues text,
  other_info text,
  participants integer,
  updated_by uuid references users(id) on delete set null,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_vertical_idx on projects (vertical_id);
