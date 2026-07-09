begin;

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  total_days numeric(6,2) not null,
  reason text,
  status text not null default 'draft',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_leave_requests_type
    check (leave_type in ('annual', 'sick', 'personal', 'unpaid', 'bereavement', 'other')),
  constraint chk_leave_requests_status
    check (status in ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  constraint chk_leave_requests_date_range
    check (end_date >= start_date),
  constraint chk_leave_requests_total_days
    check (total_days > 0),
  constraint chk_leave_requests_approval_state
    check (
      (
        status in ('draft', 'submitted', 'cancelled')
        and approved_by is null
        and approved_at is null
        and rejected_by is null
        and rejected_at is null
        and rejection_reason is null
      )
      or (
        status = 'approved'
        and approved_by is not null
        and approved_at is not null
        and rejected_by is null
        and rejected_at is null
        and rejection_reason is null
      )
      or (
        status = 'rejected'
        and approved_by is null
        and approved_at is null
        and rejected_by is not null
        and rejected_at is not null
        and length(trim(coalesce(rejection_reason, ''))) > 0
      )
    )
);

create index if not exists idx_leave_requests_employee_status
  on public.leave_requests(employee_id, status);

create index if not exists idx_leave_requests_status
  on public.leave_requests(status);

create index if not exists idx_leave_requests_start_end
  on public.leave_requests(start_date, end_date);

create index if not exists idx_leave_requests_updated_at
  on public.leave_requests(updated_at desc);

create index if not exists idx_leave_requests_approved_by
  on public.leave_requests(approved_by);

create index if not exists idx_leave_requests_rejected_by
  on public.leave_requests(rejected_by);

drop trigger if exists trg_leave_requests_updated_at on public.leave_requests;
create trigger trg_leave_requests_updated_at
before update on public.leave_requests
for each row
execute function public.set_updated_at();

create or replace function public.validate_leave_request_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'Leave requests must be created as draft';
    end if;

    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'draft' and new.status in ('submitted', 'cancelled') then
    return new;
  end if;

  if old.status = 'submitted' and new.status in ('approved', 'rejected', 'cancelled') then
    return new;
  end if;

  raise exception 'Invalid leave request transition: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists trg_validate_leave_request_transition on public.leave_requests;
create trigger trg_validate_leave_request_transition
before insert or update on public.leave_requests
for each row
execute function public.validate_leave_request_transition();

alter table public.leave_requests enable row level security;
alter table public.leave_requests force row level security;

revoke all on table public.leave_requests from anon, authenticated;
grant select, insert, update on table public.leave_requests to authenticated;

drop policy if exists "staff read leave requests" on public.leave_requests;
create policy "staff read leave requests"
on public.leave_requests
for select
to authenticated
using (public.is_staff());

drop policy if exists "staff review submitted leave requests" on public.leave_requests;
create policy "staff review submitted leave requests"
on public.leave_requests
for update
to authenticated
using (
  public.is_staff()
  and status = 'submitted'
)
with check (
  public.is_staff()
  and status in ('approved', 'rejected')
);

drop policy if exists "employee read own leave requests" on public.leave_requests;
create policy "employee read own leave requests"
on public.leave_requests
for select
to authenticated
using (
  public.is_employee()
  and exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee insert own draft leave requests" on public.leave_requests;
create policy "employee insert own draft leave requests"
on public.leave_requests
for insert
to authenticated
with check (
  public.is_employee()
  and status = 'draft'
  and approved_by is null
  and approved_at is null
  and rejected_by is null
  and rejected_at is null
  and rejection_reason is null
  and exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee update own draft leave requests" on public.leave_requests;
create policy "employee update own draft leave requests"
on public.leave_requests
for update
to authenticated
using (
  public.is_employee()
  and status = 'draft'
  and exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.auth_user_id = auth.uid()
  )
)
with check (
  public.is_employee()
  and status in ('draft', 'submitted', 'cancelled')
  and approved_by is null
  and approved_at is null
  and rejected_by is null
  and rejected_at is null
  and rejection_reason is null
  and exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee cancel own submitted leave requests" on public.leave_requests;
create policy "employee cancel own submitted leave requests"
on public.leave_requests
for update
to authenticated
using (
  public.is_employee()
  and status = 'submitted'
  and exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.auth_user_id = auth.uid()
  )
)
with check (
  public.is_employee()
  and status = 'cancelled'
  and approved_by is null
  and approved_at is null
  and rejected_by is null
  and rejected_at is null
  and rejection_reason is null
  and exists (
    select 1
    from public.employees e
    where e.id = leave_requests.employee_id
      and e.auth_user_id = auth.uid()
  )
);

commit;
