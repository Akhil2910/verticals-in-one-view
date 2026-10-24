create type public.app_role as enum ('admin','official','vertical_head');

create table public.verticals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.verticals to authenticated;
grant all on public.verticals to service_role;
alter table public.verticals enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  vertical_id uuid references public.verticals(id) on delete set null,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  unique (user_id)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.user_vertical(_user_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select vertical_id from public.user_roles where user_id = _user_id and role = 'vertical_head' limit 1
$$;

create policy "own role read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "verticals read" on public.verticals for select to authenticated using (true);
create policy "verticals admin write" on public.verticals for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid not null references public.verticals(id) on delete restrict,
  name text not null,
  project_head text,
  team_members text,
  start_date date,
  end_date date,
  status text not null default 'Ongoing',
  progress_notes text,
  physical_progress numeric not null default 0,
  milestones_completed text,
  milestones_pending text,
  total_cost numeric not null default 0,
  amount_received numeric not null default 0,
  expenditure numeric not null default 0,
  amount_receivable numeric not null default 0,
  expected_completion date,
  issues text,
  other_info text,
  updated_by uuid,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;

create policy "projects read" on public.projects for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'official') or vertical_id = public.user_vertical(auth.uid()));
create policy "projects insert" on public.projects for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or vertical_id = public.user_vertical(auth.uid()));
create policy "projects update" on public.projects for update to authenticated using (
  public.has_role(auth.uid(),'admin') or vertical_id = public.user_vertical(auth.uid()))
  with check (public.has_role(auth.uid(),'admin') or vertical_id = public.user_vertical(auth.uid()));
create policy "projects delete" on public.projects for delete to authenticated using (
  public.has_role(auth.uid(),'admin') or vertical_id = public.user_vertical(auth.uid()));

create or replace function public.touch_project() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.updated_by_name := coalesce((select coalesce(full_name, email) from public.user_roles where user_id = auth.uid()), new.updated_by_name);
  return new;
end $$;
create trigger projects_touch before insert or update on public.projects for each row execute function public.touch_project();

insert into public.verticals (name) values
('Vertical 1'),('Vertical 2'),('Vertical 3'),('Vertical 4'),('Vertical 5'),('Vertical 6'),('Vertical 7'),('Vertical 8');