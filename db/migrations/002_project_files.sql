-- Documents and photos attached to a project, each with a name saying what it is.
-- Stored in the database (bytea) so they're covered by the same RDS backups as the
-- project records; uploads are capped at 10 MB in src/lib/files.functions.ts.

create table project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('document', 'photo')),
  title text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  data bytea not null,
  uploaded_by uuid references users(id) on delete set null,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);
create index project_files_project_idx on project_files (project_id, created_at);
