# NIUM Project Records Portal

An internal app where each vertical head records their projects/programmes, officials view everything on a dashboard, and an admin manages verticals and accounts. It follows the circular (Roc. No.1078023/NIUM/2026/IT).

## Roles and logins
- **Vertical Head** (8 accounts, one per vertical): can add and edit projects for their own vertical only.
- **Official** (view-only): a dashboard showing all verticals and all projects.
- **Admin**: full control. Creates, renames and deletes verticals, creates logins and resets passwords, and can edit any project.
- There is no public signup. The admin creates every account by email and password.
- To start, the verticals are named "Vertical 1" to "Vertical 8". The admin can rename them later.

## Project form (all 16 fields from the circular)
1. Project / Programme name
2. Vertical (set automatically for vertical heads)
3. Project Head and team members
4. Start date and proposed/completed date
5. Current status (Ongoing / Completed / On hold) and progress notes
6. Physical work completed (%)
7. Milestones completed
8. Milestones pending
9. Total cost / sanctioned amount (Rs.)
10. Amount received
11. Amount yet to be received (calculated automatically)
12. Expenditure incurred
13. Amount receivable
14. Expected completion date (for ongoing projects)
15. Major issues and constraints
16. Other information

Each project also shows who last updated it and when, so the latest position is visible.

## Pages
- **Sign in**: one page for everyone, which then sends each user to their own area.
- **Vertical Head**: a list of their projects with add, edit and view.
- **Official dashboard**: totals (number of projects, ongoing vs completed, sanctioned vs received vs pending amounts), a breakdown per vertical, and a filterable table of all projects with a detail view.
- **Admin**: everything on the dashboard, plus Manage Verticals and Manage Users.
- **Print / PDF report**: a print-friendly report for one project, one vertical, or all projects, using the browser's "Save as PDF" option. This covers the hard and soft copies the circular asks for.

## Look and feel
A clean, formal government-office style: a navy and saffron accent, serif headings, dense readable tables, and the NIUM name in the header.

## Technical details
- Lovable Cloud with email/password sign-in. Signup is disabled in the app, and the admin creates users through a server function using the admin client after checking the admin role.
- Tables: `verticals`, `user_roles` (enum admin/official/vertical_head, with a vertical_id for heads), and `projects`. Each table gets grants and row-level security: heads can read and write only their own vertical's rows, officials can read everything, and the admin has full access. Role checks go through the `has_role` security-definer function.
- A migration seeds Vertical 1 to 8. The first admin account is created during setup, and I will share its credentials with you.
- Protected routes live under `_authenticated`, with role-specific pages for `/vertical`, `/dashboard` and `/admin`.
- The report uses print CSS on a `/report` route.
