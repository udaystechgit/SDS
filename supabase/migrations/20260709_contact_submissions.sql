begin;

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  phone text,
  service text not null,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_submissions_created_at
  on public.contact_submissions(created_at desc);

alter table public.contact_submissions enable row level security;
alter table public.contact_submissions force row level security;

revoke all on table public.contact_submissions from anon, authenticated;
grant select, update on table public.contact_submissions to authenticated;

drop policy if exists "staff read contact submissions" on public.contact_submissions;
create policy "staff read contact submissions"
on public.contact_submissions
for select
to authenticated
using (public.is_staff());

drop policy if exists "staff update contact submissions" on public.contact_submissions;
create policy "staff update contact submissions"
on public.contact_submissions
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

commit;
