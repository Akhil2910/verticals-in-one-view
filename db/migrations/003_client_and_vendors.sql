-- Who the project is for, and the outside firms working on it.
alter table projects add column client_name text;
-- [{ "name": "...", "scope": "...", "amount": 123 }], in the order entered.
alter table projects add column partner_vendors jsonb not null default '[]'::jsonb;
create index projects_client_idx on projects (lower(client_name));
