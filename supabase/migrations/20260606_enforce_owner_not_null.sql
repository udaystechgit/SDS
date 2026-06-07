-- SDS Supabase strict ownership enforcement
-- Apply after 20260606_init.sql and 20260606_portal_role_policies.sql

begin;

-- Keep deterministic placeholder for legacy rows that were created before
-- auth ownership wiring existed.
update public.client_requirements
set client_user_id = coalesce(client_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
where client_user_id is null;

update public.employer_requirements
set employer_user_id = coalesce(employer_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
where employer_user_id is null;

alter table public.client_requirements
  alter column client_user_id set not null;

alter table public.employer_requirements
  alter column employer_user_id set not null;

commit;
