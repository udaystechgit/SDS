begin;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint chk_audit_log_entity_type
    check (entity_type in ('timesheet', 'leave_request', 'employee')),
  constraint chk_audit_log_action
    check (action in ('created', 'updated', 'submitted', 'approved', 'rejected', 'cancelled', 'linked_auth_user')),
  constraint chk_audit_log_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_audit_log_entity_type
  on public.audit_log(entity_type);

create index if not exists idx_audit_log_entity_id
  on public.audit_log(entity_id);

create index if not exists idx_audit_log_actor_user_id
  on public.audit_log(actor_user_id);

create index if not exists idx_audit_log_created_at
  on public.audit_log(created_at desc);

create index if not exists idx_audit_log_entity
  on public.audit_log(entity_type, entity_id, created_at desc);

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

revoke all on table public.audit_log from anon, authenticated;
grant select on table public.audit_log to authenticated;

drop policy if exists "staff read audit log" on public.audit_log;
create policy "staff read audit log"
on public.audit_log
for select
to authenticated
using (public.is_staff());

commit;
