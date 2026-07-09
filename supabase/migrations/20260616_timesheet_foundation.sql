begin;

create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  status text not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_timesheets_status
    check (status in ('draft', 'submitted', 'approved', 'rejected')),
  constraint chk_timesheets_week_range
    check (week_end >= week_start),
  constraint chk_timesheets_submitted_at
    check (
      (status = 'draft' and submitted_at is null)
      or (status <> 'draft' and submitted_at is not null)
    )
);

create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  work_date date not null,
  project_name text not null default '',
  task_description text not null default '',
  hours numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_timesheet_entries_hours
    check (hours >= 0 and hours <= 24)
);

create unique index if not exists idx_timesheets_employee_week_unique
  on public.timesheets(employee_id, week_start, week_end);

create index if not exists idx_timesheets_employee_status
  on public.timesheets(employee_id, status);

create index if not exists idx_timesheets_updated_at
  on public.timesheets(updated_at desc);

create index if not exists idx_timesheet_entries_timesheet_date
  on public.timesheet_entries(timesheet_id, work_date);

drop trigger if exists trg_timesheets_updated_at on public.timesheets;
create trigger trg_timesheets_updated_at
before update on public.timesheets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_timesheet_entries_updated_at on public.timesheet_entries;
create trigger trg_timesheet_entries_updated_at
before update on public.timesheet_entries
for each row
execute function public.set_updated_at();

create or replace function public.validate_timesheet_entry_date()
returns trigger
language plpgsql
as $$
declare
  parent_week_start date;
  parent_week_end date;
begin
  select week_start, week_end
  into parent_week_start, parent_week_end
  from public.timesheets
  where id = new.timesheet_id;

  if parent_week_start is null then
    raise exception 'Timesheet % does not exist', new.timesheet_id;
  end if;

  if new.work_date < parent_week_start or new.work_date > parent_week_end then
    raise exception 'Timesheet entry date must be within the timesheet week';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_timesheet_entry_date on public.timesheet_entries;
create trigger trg_validate_timesheet_entry_date
before insert or update on public.timesheet_entries
for each row
execute function public.validate_timesheet_entry_date();

alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.timesheets force row level security;
alter table public.timesheet_entries force row level security;

revoke all on table public.timesheets from anon, authenticated;
revoke all on table public.timesheet_entries from anon, authenticated;

grant select, insert, update, delete on table public.timesheets to authenticated;
grant select, insert, update, delete on table public.timesheet_entries to authenticated;

drop policy if exists "staff manage timesheets" on public.timesheets;
create policy "staff manage timesheets"
on public.timesheets
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "employee read own timesheets" on public.timesheets;
create policy "employee read own timesheets"
on public.timesheets
for select
to authenticated
using (
  public.is_employee()
  and exists (
    select 1
    from public.employees e
    where e.id = timesheets.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee insert own draft timesheets" on public.timesheets;
create policy "employee insert own draft timesheets"
on public.timesheets
for insert
to authenticated
with check (
  public.is_employee()
  and status = 'draft'
  and submitted_at is null
  and exists (
    select 1
    from public.employees e
    where e.id = timesheets.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee update own draft timesheets" on public.timesheets;
create policy "employee update own draft timesheets"
on public.timesheets
for update
to authenticated
using (
  public.is_employee()
  and status = 'draft'
  and exists (
    select 1
    from public.employees e
    where e.id = timesheets.employee_id
      and e.auth_user_id = auth.uid()
  )
)
with check (
  public.is_employee()
  and status in ('draft', 'submitted')
  and (
    (status = 'draft' and submitted_at is null)
    or (status = 'submitted' and submitted_at is not null)
  )
  and exists (
    select 1
    from public.employees e
    where e.id = timesheets.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee delete own draft timesheets" on public.timesheets;
create policy "employee delete own draft timesheets"
on public.timesheets
for delete
to authenticated
using (
  public.is_employee()
  and status = 'draft'
  and exists (
    select 1
    from public.employees e
    where e.id = timesheets.employee_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "staff manage timesheet entries" on public.timesheet_entries;
create policy "staff manage timesheet entries"
on public.timesheet_entries
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "employee read own timesheet entries" on public.timesheet_entries;
create policy "employee read own timesheet entries"
on public.timesheet_entries
for select
to authenticated
using (
  public.is_employee()
  and exists (
    select 1
    from public.timesheets t
    join public.employees e on e.id = t.employee_id
    where t.id = timesheet_entries.timesheet_id
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee insert own draft timesheet entries" on public.timesheet_entries;
create policy "employee insert own draft timesheet entries"
on public.timesheet_entries
for insert
to authenticated
with check (
  public.is_employee()
  and exists (
    select 1
    from public.timesheets t
    join public.employees e on e.id = t.employee_id
    where t.id = timesheet_entries.timesheet_id
      and t.status = 'draft'
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee update own draft timesheet entries" on public.timesheet_entries;
create policy "employee update own draft timesheet entries"
on public.timesheet_entries
for update
to authenticated
using (
  public.is_employee()
  and exists (
    select 1
    from public.timesheets t
    join public.employees e on e.id = t.employee_id
    where t.id = timesheet_entries.timesheet_id
      and t.status = 'draft'
      and e.auth_user_id = auth.uid()
  )
)
with check (
  public.is_employee()
  and exists (
    select 1
    from public.timesheets t
    join public.employees e on e.id = t.employee_id
    where t.id = timesheet_entries.timesheet_id
      and t.status = 'draft'
      and e.auth_user_id = auth.uid()
  )
);

drop policy if exists "employee delete own draft timesheet entries" on public.timesheet_entries;
create policy "employee delete own draft timesheet entries"
on public.timesheet_entries
for delete
to authenticated
using (
  public.is_employee()
  and exists (
    select 1
    from public.timesheets t
    join public.employees e on e.id = t.employee_id
    where t.id = timesheet_entries.timesheet_id
      and t.status = 'draft'
      and e.auth_user_id = auth.uid()
  )
);

commit;
