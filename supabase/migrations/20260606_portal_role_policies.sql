-- SDS Supabase portal-role RLS hardening
-- Apply after 20260606_init.sql

begin;

-- Ownership columns for per-user portal access control.
alter table public.client_requirements
  add column if not exists client_user_id uuid;

alter table public.employer_requirements
  add column if not exists employer_user_id uuid;

-- Backfill null owner IDs for existing rows to a deterministic placeholder.
-- Existing legacy rows should be reassigned by admin later if needed.
update public.client_requirements
set client_user_id = coalesce(client_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
where client_user_id is null;

update public.employer_requirements
set employer_user_id = coalesce(employer_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
where employer_user_id is null;

-- Keep owner columns nullable for backward compatibility with existing
-- server-function writes until auth-aware ownership assignment is enabled.
alter table public.client_requirements
  alter column client_user_id drop not null;

alter table public.employer_requirements
  alter column employer_user_id drop not null;

-- Add lookup indexes for owner-scoped queries.
create index if not exists idx_client_requirements_owner_status
  on public.client_requirements(client_user_id, status);

create index if not exists idx_employer_requirements_owner_status
  on public.employer_requirements(employer_user_id, status);

-- Helper functions for portal roles.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'client';
$$;

create or replace function public.is_employer()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'employer';
$$;

-- Client requirements policies: admin/staff full + client own records.
drop policy if exists "staff manage client requirements" on public.client_requirements;
drop policy if exists "client read own requirements" on public.client_requirements;
drop policy if exists "client insert own requirements" on public.client_requirements;
drop policy if exists "client update own requirements" on public.client_requirements;

create policy "staff manage client requirements"
on public.client_requirements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "client read own requirements"
on public.client_requirements
for select
to authenticated
using (public.is_client() and client_user_id = auth.uid());

create policy "client insert own requirements"
on public.client_requirements
for insert
to authenticated
with check (
  public.is_client()
  and client_user_id = auth.uid()
);

create policy "client update own requirements"
on public.client_requirements
for update
to authenticated
using (public.is_client() and client_user_id = auth.uid())
with check (public.is_client() and client_user_id = auth.uid());

-- Employer requirements policies: admin/staff full + employer own records.
drop policy if exists "staff manage employer requirements" on public.employer_requirements;
drop policy if exists "employer read own requirements" on public.employer_requirements;
drop policy if exists "employer insert own requirements" on public.employer_requirements;
drop policy if exists "employer update own requirements" on public.employer_requirements;

create policy "staff manage employer requirements"
on public.employer_requirements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "employer read own requirements"
on public.employer_requirements
for select
to authenticated
using (public.is_employer() and employer_user_id = auth.uid());

create policy "employer insert own requirements"
on public.employer_requirements
for insert
to authenticated
with check (
  public.is_employer()
  and employer_user_id = auth.uid()
);

create policy "employer update own requirements"
on public.employer_requirements
for update
to authenticated
using (public.is_employer() and employer_user_id = auth.uid())
with check (public.is_employer() and employer_user_id = auth.uid());

-- Employees remain staff-managed; explicitly deny direct anon access.
revoke all on table public.employees from anon;

commit;
