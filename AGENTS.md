<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Self-hosted: Postgres (AWS RDS) via `postgres` in `src/server/db.server.ts`; schema changes are new files in `db/migrations/` (applied in name order by `scripts/migrate.mjs`, also on every server start). Supabase is no longer used.
- Signed-in pages live under `src/routes/app*.tsx` with a client-only (`ssr: false`) `/app` layout that loads the user's role into route context via the `getMe` server function; role-specific pages redirect in `beforeLoad`. Accounts with `must_change_password` are sent to `/app/account` first.
- Sessions: random token in an httpOnly cookie, only its sha256 stored in `sessions`; passwords hashed with scrypt (`src/server/auth.server.ts`).
- Access rules are enforced in server functions (`src/lib/api.functions.ts`, `src/lib/admin.functions.ts`), not in the UI: vertical heads read and write only their own vertical, officials read everything, admins do everything. Every handler calls `requireUser(...)` first. Why: there is no row-level security any more.
- Server-only modules (`src/server/*.server.ts`) are imported with `await import(...)` inside handlers so they never reach the browser bundle.
- Public signup is disabled; accounts are created only by admin server functions (the `/setup` page works only while no admin exists).
- Physical progress applicability is stored in a separate boolean without replacing the percentage; form, details, tables and reports use the shared applicability predicate. Why: preserves existing numeric data and distinguishes not applicable from zero.
- Deployment: `infra/aws/` (CloudFormation + scripts); see `infra/aws/README.md`.
