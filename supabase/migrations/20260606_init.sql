-- SDS Supabase baseline schema
-- Run with: supabase db push (or in SQL editor)

create extension if not exists pgcrypto;

create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_title text not null,
  department text not null,
  service_domain text not null,
  location text not null,
  job_type text not null,
  experience_level text not null,
  work_mode text not null,
  short_description text not null,
  responsibilities text not null,
  requirements_skills text not null,
  salary_range text not null default '',
  application_email text not null,
  status text not null check (status in ('Draft', 'Published', 'Closed')),
  posted_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,
  full_name text not null,
  email text not null,
  phone text not null default '',
  job_title text not null,
  employee_type text not null,
  assigned_client text not null default '',
  assigned_project text not null default '',
  service_domain text not null,
  start_date date not null,
  end_date date,
  work_mode text not null,
  work_location text not null,
  hourly_rate text not null default '',
  billing_rate text not null default '',
  responsibilities text not null default '',
  required_skills text not null default '',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_requirements (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  service_domain text not null,
  service_needed text not null,
  project_name text not null,
  location text not null,
  work_mode text not null,
  required_start_date date,
  expected_duration text not null,
  required_skills text not null,
  number_of_resources_needed integer not null default 1,
  budget_rate_range text not null default '',
  description text not null,
  priority text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employer_requirements (
  id uuid primary key default gen_random_uuid(),
  employer_name text not null,
  job_title text not null,
  department text not null,
  client_project text not null default '',
  location text not null,
  job_type text not null,
  work_mode text not null,
  experience_level text not null,
  required_skills text not null,
  responsibilities text not null,
  number_of_openings integer not null default 1,
  start_date date,
  duration text not null default '',
  rate_range text not null default '',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Data integrity constraints (defense in depth)
alter table public.job_requirements
  drop constraint if exists chk_job_requirements_email_format;
alter table public.job_requirements
  add constraint chk_job_requirements_email_format
  check (application_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

alter table public.employees
  drop constraint if exists chk_employees_email_format;
alter table public.employees
  add constraint chk_employees_email_format
  check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$');

alter table public.employees
  drop constraint if exists chk_employees_end_date_after_start_date;
alter table public.employees
  add constraint chk_employees_end_date_after_start_date
  check (end_date is null or end_date >= start_date);

alter table public.client_requirements
  drop constraint if exists chk_client_requirements_resource_count;
alter table public.client_requirements
  add constraint chk_client_requirements_resource_count
  check (number_of_resources_needed > 0);

alter table public.employer_requirements
  drop constraint if exists chk_employer_requirements_openings;
alter table public.employer_requirements
  add constraint chk_employer_requirements_openings
  check (number_of_openings > 0);

-- Performance indexes for common filters/sorts
create index if not exists idx_job_requirements_status_posted_date
  on public.job_requirements(status, posted_date desc);
create index if not exists idx_job_requirements_updated_at
  on public.job_requirements(updated_at desc);
create index if not exists idx_employees_status_service_domain
  on public.employees(status, service_domain);
create index if not exists idx_employees_updated_at
  on public.employees(updated_at desc);
create index if not exists idx_client_requirements_status_priority
  on public.client_requirements(status, priority);
create index if not exists idx_client_requirements_updated_at
  on public.client_requirements(updated_at desc);
create index if not exists idx_employer_requirements_status
  on public.employer_requirements(status);
create index if not exists idx_employer_requirements_updated_at
  on public.employer_requirements(updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_job_requirements_updated_at on public.job_requirements;
create trigger trg_job_requirements_updated_at
before update on public.job_requirements
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row
execute function public.set_updated_at();

drop trigger if exists trg_client_requirements_updated_at on public.client_requirements;
create trigger trg_client_requirements_updated_at
before update on public.client_requirements
for each row
execute function public.set_updated_at();

drop trigger if exists trg_employer_requirements_updated_at on public.employer_requirements;
create trigger trg_employer_requirements_updated_at
before update on public.employer_requirements
for each row
execute function public.set_updated_at();

alter table public.job_requirements enable row level security;
alter table public.employees enable row level security;
alter table public.client_requirements enable row level security;
alter table public.employer_requirements enable row level security;

alter table public.job_requirements force row level security;
alter table public.employees force row level security;
alter table public.client_requirements force row level security;
alter table public.employer_requirements force row level security;

-- Helper functions for centralized RBAC checks.
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), 'anonymous');
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('admin', 'staff');
$$;

-- Least-privilege table grants. RLS policies still gate row-level access.
revoke all on table public.job_requirements from anon, authenticated;
revoke all on table public.employees from anon, authenticated;
revoke all on table public.client_requirements from anon, authenticated;
revoke all on table public.employer_requirements from anon, authenticated;

grant select on table public.job_requirements to anon, authenticated;
grant select, insert, update, delete on table public.employees to authenticated;
grant select, insert, update, delete on table public.client_requirements to authenticated;
grant select, insert, update, delete on table public.employer_requirements to authenticated;

-- Read-only access to published jobs for anonymous/public users.
drop policy if exists "public read published jobs" on public.job_requirements;
create policy "public read published jobs"
on public.job_requirements
for select
to anon, authenticated
using (status = 'Published');

-- Authenticated staff can fully manage all business tables.
drop policy if exists "staff manage jobs" on public.job_requirements;
create policy "staff manage jobs"
on public.job_requirements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "staff manage employees" on public.employees;
create policy "staff manage employees"
on public.employees
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "staff manage client requirements" on public.client_requirements;
create policy "staff manage client requirements"
on public.client_requirements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "staff manage employer requirements" on public.employer_requirements;
create policy "staff manage employer requirements"
on public.employer_requirements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());
