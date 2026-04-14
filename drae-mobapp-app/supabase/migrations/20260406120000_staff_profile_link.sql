-- Link staff_members to resident profiles so the mobile app can show assignments + notifications.
alter table public.staff_members
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists staff_members_profile_id_unique
  on public.staff_members (profile_id)
  where profile_id is not null;

comment on column public.staff_members.profile_id is
  'When set, this staff row is tied to a resident profile (same person can use My assignments in the app).';

-- Demo: Leo P. Mendoza (general pool) is the same person as Juan Dela Cruz in the app (profile 1111...).
update public.staff_members
set profile_id = '11111111-1111-1111-1111-111111111111'
where id = 'f4444444-4444-4444-4444-444444444444';

-- Ensure Juan's sample flood report is assigned to that staff row (My assignments demo).
update public.incident_reports
set assigned_staff_id = 'f4444444-4444-4444-4444-444444444444'
where id = 'a1111111-1111-1111-1111-111111111111';
