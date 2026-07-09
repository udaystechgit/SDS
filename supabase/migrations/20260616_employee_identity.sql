begin;

alter table public.employees
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists idx_employees_auth_user_id_unique
  on public.employees(auth_user_id)
  where auth_user_id is not null;

create or replace function public.is_employee()
returns boolean
language sql
stable
as $$
  select public.current_app_role() = 'employee';
$$;

drop policy if exists "employee read own profile" on public.employees;

create policy "employee read own profile"
on public.employees
for select
to authenticated
using (
  public.is_employee()
  and auth_user_id = auth.uid()
);

commit;
