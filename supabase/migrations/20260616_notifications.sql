begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chk_notifications_type
    check (type in ('timesheet_approved', 'timesheet_rejected', 'leave_approved', 'leave_rejected')),
  constraint chk_notifications_entity_type
    check (entity_type is null or entity_type in ('timesheet', 'leave_request'))
);

create index if not exists idx_notifications_user_id
  on public.notifications(user_id);

create index if not exists idx_notifications_is_read
  on public.notifications(is_read);

create index if not exists idx_notifications_created_at
  on public.notifications(created_at desc);

create index if not exists idx_notifications_user_read_created
  on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;
alter table public.notifications force row level security;

revoke all on table public.notifications from anon, authenticated;
grant select, update on table public.notifications to authenticated;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and is_read = true
);

drop policy if exists "staff read notifications" on public.notifications;
create policy "staff read notifications"
on public.notifications
for select
to authenticated
using (public.is_staff());

commit;
