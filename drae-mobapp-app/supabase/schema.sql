-- Enable UUID generation if not enabled yet.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  address text,
  contact_number text,
  gender text,
  age int,
  email text,
  contact_person text,
  contact_person_number text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists profiles_user_id_unique
  on public.profiles (user_id)
  where user_id is not null;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  reporter_name text,
  reporter_contact text,
  hazard_type text not null,
  location_text text,
  description text not null,
  evidence_url text,
  audio_url text,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

alter table public.incident_reports
  add column if not exists audio_url text;

create table if not exists public.hotlines (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  phone text not null,
  priority int not null default 100
);

create table if not exists public.evacuation_centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  contact text,
  latitude double precision,
  longitude double precision
);

alter table public.evacuation_centers
  add column if not exists latitude double precision;

alter table public.evacuation_centers
  add column if not exists longitude double precision;

create table if not exists public.household_readiness (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  score int not null default 0,
  checked_items text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.advisories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  severity text not null default 'low',
  source text not null default 'CDRRMO Dasmarinas',
  is_verified boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Response team: used for automatic assignment of incident reports (load-balanced, hazard-aware).
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  phone text,
  hazard_types text[] not null default '{}',
  active boolean not null default true,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists staff_members_profile_id_unique
  on public.staff_members (profile_id)
  where profile_id is not null;

alter table public.incident_reports
  add column if not exists assigned_staff_id uuid references public.staff_members(id) on delete set null;

alter table public.incident_reports
  add column if not exists latitude double precision;

alter table public.incident_reports
  add column if not exists longitude double precision;

drop trigger if exists trg_auto_assign_incident on public.incident_reports;
drop function if exists public.auto_assign_incident_report();

create or replace function public.auto_assign_incident_report()
returns trigger
language plpgsql
as $$
declare
  pick uuid;
  hazard text;
begin
  if new.assigned_staff_id is not null then
    return new;
  end if;

  hazard := coalesce(new.hazard_type, '');

  select sm.id into pick
  from public.staff_members sm
  where sm.active = true
    and (
      cardinality(sm.hazard_types) = 0
      or hazard = any (sm.hazard_types)
    )
  order by (
    select count(*)::bigint
    from public.incident_reports ir
    where ir.assigned_staff_id = sm.id
      and ir.status in ('submitted', 'in_progress')
  ) asc,
  sm.full_name asc
  limit 1;

  if pick is null then
    select sm.id into pick
    from public.staff_members sm
    where sm.active = true
    order by (
      select count(*)::bigint
      from public.incident_reports ir
      where ir.assigned_staff_id = sm.id
        and ir.status in ('submitted', 'in_progress')
    ) asc,
    sm.full_name asc
    limit 1;
  end if;

  if pick is not null then
    new.assigned_staff_id := pick;
  end if;

  return new;
end;
$$;

create trigger trg_auto_assign_incident
before insert on public.incident_reports
for each row
execute procedure public.auto_assign_incident_report();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hotlines_label_unique'
  ) then
    alter table public.hotlines
      add constraint hotlines_label_unique unique (label);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'evacuation_centers_name_unique'
  ) then
    alter table public.evacuation_centers
      add constraint evacuation_centers_name_unique unique (name);
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.incident_reports enable row level security;
alter table public.hotlines enable row level security;
alter table public.evacuation_centers enable row level security;
alter table public.household_readiness enable row level security;
alter table public.advisories enable row level security;
alter table public.staff_members enable row level security;

-- Prototype-only policies for open access via anon key.
drop policy if exists "profiles_open_access" on public.profiles;
create policy "profiles_open_access" on public.profiles
for all
to anon
using (true)
with check (true);

drop policy if exists "incident_reports_open_access" on public.incident_reports;
create policy "incident_reports_open_access" on public.incident_reports
for all
to anon
using (true)
with check (true);

drop policy if exists "hotlines_read_access" on public.hotlines;
drop policy if exists "hotlines_open_access" on public.hotlines;
create policy "hotlines_open_access" on public.hotlines
for all
to anon
using (true)
with check (true);

drop policy if exists "evacuation_centers_read_access" on public.evacuation_centers;
create policy "evacuation_centers_read_access" on public.evacuation_centers
for select
to anon
using (true);

drop policy if exists "household_readiness_open_access" on public.household_readiness;
create policy "household_readiness_open_access" on public.household_readiness
for all
to anon
using (true)
with check (true);

drop policy if exists "advisories_open_access" on public.advisories;
create policy "advisories_open_access" on public.advisories
for all
to anon
using (true)
with check (true);

drop policy if exists "staff_members_open_access" on public.staff_members;
create policy "staff_members_open_access" on public.staff_members
for all
to anon
using (true)
with check (true);

-- Logged-in mobile clients use the authenticated role; mirror open policies for development.
drop policy if exists "profiles_authenticated_all" on public.profiles;
create policy "profiles_authenticated_all" on public.profiles
for all
to authenticated
using (true)
with check (true);

drop policy if exists "incident_reports_authenticated_all" on public.incident_reports;
create policy "incident_reports_authenticated_all" on public.incident_reports
for all
to authenticated
using (true)
with check (true);

drop policy if exists "hotlines_authenticated_all" on public.hotlines;
create policy "hotlines_authenticated_all" on public.hotlines
for all
to authenticated
using (true)
with check (true);

drop policy if exists "evacuation_centers_authenticated_select" on public.evacuation_centers;
create policy "evacuation_centers_authenticated_select" on public.evacuation_centers
for select
to authenticated
using (true);

drop policy if exists "household_readiness_authenticated_all" on public.household_readiness;
create policy "household_readiness_authenticated_all" on public.household_readiness
for all
to authenticated
using (true)
with check (true);

drop policy if exists "advisories_authenticated_all" on public.advisories;
create policy "advisories_authenticated_all" on public.advisories
for all
to authenticated
using (true)
with check (true);

drop policy if exists "staff_members_authenticated_all" on public.staff_members;
create policy "staff_members_authenticated_all" on public.staff_members
for all
to authenticated
using (true)
with check (true);

-- PostgREST uses anon / authenticated; without GRANTs, queries return 42501 even with RLS policies.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.incident_reports to anon, authenticated;
grant select, insert, update, delete on table public.hotlines to anon, authenticated;
grant select, insert, update, delete on table public.evacuation_centers to anon, authenticated;
grant select, insert, update, delete on table public.household_readiness to anon, authenticated;
grant select, insert, update, delete on table public.advisories to anon, authenticated;
grant select, insert, update, delete on table public.staff_members to anon, authenticated;

-- Seed sample data for development/demo.
-- This section keeps exactly five rows per table with deterministic IDs.

delete from public.incident_reports;
delete from public.household_readiness;
delete from public.staff_members;
delete from public.profiles;

insert into public.profiles (
  id,
  full_name,
  address,
  contact_number,
  gender,
  age,
  email,
  contact_person,
  contact_person_number,
  avatar_url
)
values
  ('11111111-1111-1111-1111-111111111111', 'Juan Dela Cruz', 'Paliparan III, Dasmarinas', '09171234567', 'Male', 30, 'juan.delacruz@email.com', 'Maria Dela Cruz', '09181234567', 'https://api.dicebear.com/9.x/initials/png?seed=Juan%20Dela%20Cruz'),
  ('22222222-2222-2222-2222-222222222222', 'Ana Santos', 'Salawag, Dasmarinas', '09172345678', 'Female', 27, 'ana.santos@email.com', 'Leo Santos', '09182345678', 'https://api.dicebear.com/9.x/initials/png?seed=Ana%20Santos'),
  ('33333333-3333-3333-3333-333333333333', 'Mark Reyes', 'Langkaan II, Dasmarinas', '09173456789', 'Male', 35, 'mark.reyes@email.com', 'Lina Reyes', '09183456789', 'https://api.dicebear.com/9.x/initials/png?seed=Mark%20Reyes'),
  ('44444444-4444-4444-4444-444444444444', 'Joy Mendoza', 'Dasmarinas Bayan, Cavite', '09174567890', 'Female', 24, 'joy.mendoza@email.com', 'Paolo Mendoza', '09184567890', 'https://api.dicebear.com/9.x/initials/png?seed=Joy%20Mendoza'),
  ('55555555-5555-5555-5555-555555555555', 'Neil Garcia', 'San Agustin II, Dasmarinas', '09175678901', 'Male', 41, 'neil.garcia@email.com', 'Rica Garcia', '09185678901', 'https://api.dicebear.com/9.x/initials/png?seed=Neil%20Garcia'),
  ('66666666-6666-6666-6666-666666666666', 'Rosa Villanueva', 'Burol Main, Dasmarinas', '09176111111', 'Female', 33, 'rosa.v@email.com', 'Miguel Villanueva', '09186111111', 'https://api.dicebear.com/9.x/initials/png?seed=Rosa%20Villanueva'),
  ('77777777-7777-7777-7777-777777777777', 'Carlo Ramos', 'Sabang, Dasmarinas', '09176222222', 'Male', 29, 'carlo.r@email.com', 'Liza Ramos', '09186222222', 'https://api.dicebear.com/9.x/initials/png?seed=Carlo%20Ramos'),
  ('88888888-8888-8888-8888-888888888888', 'Liza Fernandez', 'Zone IV, Dasmarinas', '09176333333', 'Female', 38, 'liza.f@email.com', 'Paolo Fernandez', '09186333333', 'https://api.dicebear.com/9.x/initials/png?seed=Liza%20Fernandez'),
  ('99999999-9999-9999-9999-999999999999', 'Miguel Torres', 'Burol II, Dasmarinas', '09176444444', 'Male', 45, 'miguel.t@email.com', 'Ana Torres', '09186444444', 'https://api.dicebear.com/9.x/initials/png?seed=Miguel%20Torres'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Patricia Cruz', 'Langkaan I, Dasmarinas', '09176555555', 'Female', 26, 'patricia.c@email.com', 'Jon Cruz', '09186555555', 'https://api.dicebear.com/9.x/initials/png?seed=Patricia%20Cruz'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Daniel Navarro', 'Paliparan I, Dasmarinas', '09176666666', 'Male', 32, 'daniel.n@email.com', 'Grace Navarro', '09186666666', 'https://api.dicebear.com/9.x/initials/png?seed=Daniel%20Navarro'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Sofia Ramos', 'Salawag, Dasmarinas', '09176777777', 'Female', 22, 'sofia.r@email.com', 'Leo Ramos', '09186777777', 'https://api.dicebear.com/9.x/initials/png?seed=Sofia%20Ramos'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Gabriel Lopez', 'San Agustin I, Dasmarinas', '09176888888', 'Male', 36, 'gabriel.l@email.com', 'Mia Lopez', '09186888888', 'https://api.dicebear.com/9.x/initials/png?seed=Gabriel%20Lopez'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Hannah Cruz', 'Fatima I, Dasmarinas', '09176999999', 'Female', 28, 'hannah.c@email.com', 'Noah Cruz', '09186999999', 'https://api.dicebear.com/9.x/initials/png?seed=Hannah%20Cruz'),
  ('10101010-1010-1010-1010-101010101010', 'Ivan Mendoza', 'Sampaloc IV, Dasmarinas', '09176000000', 'Male', 40, 'ivan.m@email.com', 'Rica Mendoza', '09186000000', 'https://api.dicebear.com/9.x/initials/png?seed=Ivan%20Mendoza')
on conflict (id) do update set
  full_name = excluded.full_name,
  address = excluded.address,
  contact_number = excluded.contact_number,
  gender = excluded.gender,
  age = excluded.age,
  email = excluded.email,
  contact_person = excluded.contact_person,
  contact_person_number = excluded.contact_person_number,
  avatar_url = excluded.avatar_url;

-- staff_members.profile_id references profiles — must run after profiles seed.
insert into public.staff_members (
  id,
  full_name,
  role,
  phone,
  hazard_types,
  active,
  profile_id
)
values
  (
    'f1111111-1111-1111-1111-111111111111',
    'Maria L. Santos',
    'CDRRMO Field Responder',
    '09170001111',
    array['Flood', 'Landslide']::text[],
    true,
    null
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'Jose R. Ramos',
    'Fire & Rescue Liaison',
    '09170002222',
    array['Fire', 'Earthquake']::text[],
    true,
    null
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'Ana K. Cruz',
    'Operations Coordinator',
    '09170003333',
    array['Others', 'Tropical Cyclone']::text[],
    true,
    null
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'Leo P. Mendoza',
    'General Response Pool',
    '09170004444',
    '{}'::text[],
    true,
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  hazard_types = excluded.hazard_types,
  active = excluded.active,
  profile_id = excluded.profile_id;

insert into public.incident_reports (
  id,
  profile_id,
  reporter_name,
  reporter_contact,
  hazard_type,
  location_text,
  latitude,
  longitude,
  description,
  evidence_url,
  audio_url,
  status,
  created_at,
  assigned_staff_id
)
values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Juan Dela Cruz', '09171234567', 'Flood', 'Paliparan III main road', 14.2997, 120.9875, 'Waist-deep flood and stranded commuters.', null, null, 'submitted', now() - interval '5 hours', 'f4444444-4444-4444-4444-444444444444'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Ana Santos', '09172345678', 'Fire', 'Salawag market', 14.3272, 120.9764, 'Small fire from electrical post.', null, null, 'in_progress', now() - interval '4 hours', null),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Mark Reyes', '09173456789', 'Landslide', 'Langkaan hillside area', 14.3457, 120.9447, 'Soil movement near homes.', null, null, 'submitted', now() - interval '3 hours', null),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Joy Mendoza', '09174567890', 'Earthquake', 'Dasmarinas Bayan', 14.3298, 120.9371, 'Falling debris from old structure.', null, null, 'resolved', now() - interval '2 hours', null),
  ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Neil Garcia', '09175678901', 'Others', 'San Agustin II', 14.3185, 120.9288, 'Blocked drainage and rising water.', null, null, 'submitted', now() - interval '1 hour', null)
on conflict (id) do update set
  profile_id = excluded.profile_id,
  reporter_name = excluded.reporter_name,
  reporter_contact = excluded.reporter_contact,
  hazard_type = excluded.hazard_type,
  location_text = excluded.location_text,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  description = excluded.description,
  assigned_staff_id = coalesce(excluded.assigned_staff_id, public.incident_reports.assigned_staff_id),
  evidence_url = excluded.evidence_url,
  audio_url = excluded.audio_url,
  status = excluded.status,
  created_at = excluded.created_at;

insert into public.hotlines (label, phone, priority)
values
  ('CDRRMO', '0464810555', 1),
  ('Police (PNP)', '0464160254', 2),
  ('Fire (BFP)', '0464160254', 3),
  ('Ambulance', '09985665555', 4),
  ('Rescue 300 Base Radio', '0464814400', 5)
on conflict (label) do update set
  phone = excluded.phone,
  priority = excluded.priority;

insert into public.evacuation_centers (name, address, contact, latitude, longitude)
values
  ('Dasmarinas City Gymnasium', 'Congressional Road, Dasmarinas', '046-481-0555', 14.3262, 120.9399),
  ('Paliparan Evacuation Site', 'Barangay Paliparan III, Dasmarinas', '0917-777-5263', 14.2997, 120.9875),
  ('Salawag Covered Court', 'Barangay Salawag, Dasmarinas', '0998-834-5477', 14.3272, 120.9764),
  ('Langkaan Multi-Purpose Hall', 'Barangay Langkaan II, Dasmarinas', '0917-111-2233', 14.3457, 120.9447),
  ('Sampaloc Covered Court', 'Barangay Sampaloc I, Dasmarinas', '0918-222-3344', 14.3143, 120.9325)
on conflict (name) do update set
  address = excluded.address,
  contact = excluded.contact,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

insert into public.household_readiness (id, profile_id, score, checked_items, updated_at)
values
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 83, '{"go_bag","hotlines","evac_plan","first_aid","alerts"}', now() - interval '4 hours'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 67, '{"go_bag","hotlines","documents","alerts"}', now() - interval '3 hours'),
  ('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 50, '{"go_bag","evac_plan","first_aid"}', now() - interval '2 hours'),
  ('b4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 33, '{"hotlines","documents"}', now() - interval '90 minutes'),
  ('b5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 17, '{"alerts"}', now() - interval '30 minutes'),
  ('b6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 90, '{"go_bag","hotlines","evac_plan","first_aid","alerts","documents"}', now() - interval '5 hours'),
  ('b7777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', 72, '{"go_bag","hotlines","alerts"}', now() - interval '4 hours'),
  ('b8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', 55, '{"go_bag","evac_plan"}', now() - interval '3 hours'),
  ('b9999999-9999-9999-9999-999999999999', '99999999-9999-9999-9999-999999999999', 40, '{"hotlines","documents"}', now() - interval '2 hours'),
  ('baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 28, '{"alerts"}', now() - interval '90 minutes'),
  ('dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 65, '{"go_bag","first_aid","evac_plan","alerts"}', now() - interval '6 hours'),
  ('bccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 48, '{"go_bag","hotlines"}', now() - interval '3 hours'),
  ('bddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 77, '{"go_bag","hotlines","evac_plan","documents","alerts"}', now() - interval '1 hour'),
  ('beeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 22, '{"hotlines"}', now() - interval '30 minutes'),
  ('c0101010-0101-0101-0101-010101010101', '10101010-1010-1010-1010-101010101010', 60, '{"go_bag","evac_plan","alerts"}', now() - interval '2 hours')
on conflict (id) do update set
  profile_id = excluded.profile_id,
  score = excluded.score,
  checked_items = excluded.checked_items,
  updated_at = excluded.updated_at;

insert into public.advisories (id, title, message, severity, source, is_verified, is_active, created_at)
values
  ('c1111111-1111-1111-1111-111111111111', 'Moderate Rain Advisory', 'Expect moderate rain this afternoon. Residents near rivers and low-lying areas should monitor water levels and prepare for possible evacuation.', 'medium', 'CDRRMO Dasmarinas', true, true, now() - interval '2 hours'),
  ('c2222222-2222-2222-2222-222222222222', 'Flood Preparedness Reminder', 'Prepare go-bags, charge mobile devices, and keep emergency numbers available at all times.', 'low', 'CDRRMO Dasmarinas', true, true, now() - interval '90 minutes'),
  ('c3333333-3333-3333-3333-333333333333', 'Landslide Watch', 'Communities near slopes should stay alert for soil movement and cracks, especially during heavy rainfall.', 'high', 'CDRRMO Dasmarinas', true, true, now() - interval '45 minutes'),
  ('c4444444-4444-4444-4444-444444444444', 'Evacuation Center Standby', 'Selected evacuation centers are on standby for immediate activation if weather conditions worsen.', 'medium', 'CDRRMO Dasmarinas', true, true, now() - interval '30 minutes'),
  ('c5555555-5555-5555-5555-555555555555', 'Hotline Verification Notice', 'Use only official CDRRMO hotlines and verified LGU advisories for emergency response and updates.', 'low', 'CDRRMO Dasmarinas', true, true, now() - interval '10 minutes')
on conflict (id) do update set
  title = excluded.title,
  message = excluded.message,
  severity = excluded.severity,
  source = excluded.source,
  is_verified = excluded.is_verified,
  is_active = excluded.is_active,
  created_at = excluded.created_at;
