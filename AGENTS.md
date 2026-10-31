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
- Signed-in pages live under `src/routes/app*.tsx` with a client-only (`ssr: false`) `/app` layout that loads the user's role into route context; role-specific pages redirect in `beforeLoad`. Why: session lives in browser storage.
- Roles (admin / official / vertical_head + vertical_id) live only in `public.user_roles`; RLS uses `has_role` and `user_vertical` security-definer functions. Why: prevents privilege escalation.
- Public signup is disabled; accounts are created only by admin server functions in `src/lib/admin.functions.ts` (the `/setup` page works only while no admin exists). Why: internal tool.
- Physical progress applicability is stored in a separate boolean without replacing the percentage; form, details, tables and reports use the shared applicability predicate. Why: preserves existing numeric data and distinguishes not applicable from zero.
