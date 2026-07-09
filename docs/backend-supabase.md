# Supabase Backend Design

## Goals

- Replace local browser storage with a shared backend data source.
- Keep public job listings readable without admin login.
- Keep admin mutations server-only via TanStack Start server functions.
- Preserve local fallback behavior while environment setup is in progress.

## Architecture

- Database: Supabase Postgres with RLS and table-level policies.
- Server API layer: `createServerFn` modules in `src/lib/api/*`.
- Supabase server client: `src/lib/supabase/server.server.ts` (service role key only on server).
- Supabase browser client: `src/lib/supabase/client.ts` (anon key, for future authenticated UI usage).
- Feature data model mapping:
  - app model uses camelCase.
  - database rows use snake_case.
  - mapping lives in each API module.

## Implemented Slices

- Job requirements backend-enabled via:
  - `listJobRequirementsFn`
  - `upsertJobRequirementFn`
  - `deleteJobRequirementFn`
- Employee management backend-enabled via:
  - `listEmployeesFn`
  - `upsertEmployeeFn`
  - `deleteEmployeeFn`
- Client requirements backend-enabled via:
  - `listClientRequirementsFn`
  - `upsertClientRequirementFn`
- Employer requirements backend-enabled via:
  - `listEmployerRequirementsFn`
  - `upsertEmployerRequirementFn`
- Routes wired:
  - `src/routes/admin.jobs.tsx`
  - `src/routes/careers.tsx`
  - `src/routes/admin.employees.tsx`
  - `src/routes/client.requirements.tsx`
  - `src/routes/employer.jobs.tsx`
- If Supabase env is missing, routes fall back to existing localStorage behavior.

## Environment

Set these values in your deployment and local env:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Vercel Deployment Notes

- Add all three variables in Vercel Project Settings -> Environment Variables.
- Configure them for Production, Preview, and Development environments.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required for browser usage.
- `SUPABASE_SERVICE_ROLE_KEY` is required for server functions in `src/lib/api/*.functions.ts`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through client-rendered responses.
- Trigger a redeploy after env changes to refresh build output.

## Database Schema

- SQL migration: `supabase/migrations/20260606_init.sql`
- SQL migration: `supabase/migrations/20260606_portal_role_policies.sql`
- SQL migration: `supabase/migrations/20260606_enforce_owner_not_null.sql`
- Includes:
  - `job_requirements`
  - `employees`
  - `client_requirements`
  - `employer_requirements`
  - `updated_at` trigger
  - RLS policies

## Security Model

- Public users: read-only published jobs.
- Authenticated users: role-gated access via JWT `app_metadata.role`.
- `admin` and `staff`: full business-table management.
- `client`: own `client_requirements` only (owner-scoped by `client_user_id`).
- `employer`: own `employer_requirements` only (owner-scoped by `employer_user_id`).
- Server functions use service role for privileged writes.

## Ownership Wiring

- Client portal writes now pass the current Supabase user ID as `ownerUserId`.
- Employer portal writes now pass the current Supabase user ID as `ownerUserId`.
- Server upsert functions persist owner IDs into:
  - `client_requirements.client_user_id`
  - `employer_requirements.employer_user_id`
- On updates, existing owner IDs are preserved.
- Strict mode: server upsert functions reject create/update when owner ID is unavailable.

## Next Recommended Steps

1. Add Supabase Auth and role checks in server functions.
2. Migrate employees/client/employer requirements routes to API modules.
3. Add audit log table for admin actions (create/update/delete/publish).
4. Remove localStorage fallback after production cutover.
