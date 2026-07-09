begin;

alter table public.timesheets
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id),
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text;

alter table public.timesheets
  drop constraint if exists chk_timesheets_approval_state;

alter table public.timesheets
  add constraint chk_timesheets_approval_state
  check (
    (
      status in ('draft', 'submitted')
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
  );

create index if not exists idx_timesheets_status
  on public.timesheets(status);

create index if not exists idx_timesheets_submitted_at
  on public.timesheets(submitted_at desc);

create index if not exists idx_timesheets_approved_by
  on public.timesheets(approved_by);

create index if not exists idx_timesheets_rejected_by
  on public.timesheets(rejected_by);

commit;
