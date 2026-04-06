-- DRAE Mobile App Dummy Data
-- Paste this in Supabase SQL Editor after running schema.sql.

-- Keep only demo rows for clear testing.
delete from public.incident_reports;
delete from public.household_readiness;
delete from public.staff_members;
delete from public.profiles;
delete from public.hotlines;
delete from public.evacuation_centers;
delete from public.advisories;

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
  ('10101010-1010-1010-1010-101010101010', 'Ivan Mendoza', 'Sampaloc IV, Dasmarinas', '09176000000', 'Male', 40, 'ivan.m@email.com', 'Rica Mendoza', '09186000000', 'https://api.dicebear.com/9.x/initials/png?seed=Ivan%20Mendoza');

insert into public.staff_members (
  id,
  full_name,
  role,
  phone,
  hazard_types,
  active
)
values
  (
    'f1111111-1111-1111-1111-111111111111',
    'Maria L. Santos',
    'CDRRMO Field Responder',
    '09170001111',
    array['Flood', 'Landslide']::text[],
    true
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'Jose R. Ramos',
    'Fire & Rescue Liaison',
    '09170002222',
    array['Fire', 'Earthquake']::text[],
    true
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'Ana K. Cruz',
    'Operations Coordinator',
    '09170003333',
    array['Others', 'Tropical Cyclone']::text[],
    true
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'Leo P. Mendoza',
    'General Response Pool',
    '09170004444',
    '{}'::text[],
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role,
  phone = excluded.phone,
  hazard_types = excluded.hazard_types,
  active = excluded.active;

insert into public.incident_reports (
  id,
  profile_id,
  reporter_name,
  reporter_contact,
  hazard_type,
  location_text,
  description,
  evidence_url,
  audio_url,
  status,
  created_at
)
values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Juan Dela Cruz', '09171234567', 'Flood', 'Paliparan III main road', 'Waist-deep flood and stranded commuters.', null, null, 'submitted', now() - interval '5 hours'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Ana Santos', '09172345678', 'Fire', 'Salawag market', 'Small fire from electrical post.', null, null, 'in_progress', now() - interval '4 hours'),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Mark Reyes', '09173456789', 'Landslide', 'Langkaan hillside area', 'Soil movement near homes.', null, null, 'submitted', now() - interval '3 hours'),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Joy Mendoza', '09174567890', 'Earthquake', 'Dasmarinas Bayan', 'Falling debris from old structure.', null, null, 'resolved', now() - interval '2 hours'),
  ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Neil Garcia', '09175678901', 'Others', 'San Agustin II', 'Blocked drainage and rising water.', null, null, 'submitted', now() - interval '1 hour');

insert into public.hotlines (label, phone, priority)
values
  ('CDRRMO', '0464810555', 1),
  ('Police (PNP)', '0464160254', 2),
  ('Fire (BFP)', '0464160254', 3),
  ('Ambulance', '09985665555', 4),
  ('Rescue 300 Base Radio', '0464814400', 5);

insert into public.evacuation_centers (name, address, contact, latitude, longitude)
values
  ('Dasmarinas City Gymnasium', 'Congressional Road, Dasmarinas', '046-481-0555', 14.3262, 120.9399),
  ('Paliparan Evacuation Site', 'Barangay Paliparan III, Dasmarinas', '0917-777-5263', 14.2997, 120.9875),
  ('Salawag Covered Court', 'Barangay Salawag, Dasmarinas', '0998-834-5477', 14.3272, 120.9764),
  ('Langkaan Multi-Purpose Hall', 'Barangay Langkaan II, Dasmarinas', '0917-111-2233', 14.3457, 120.9447),
  ('Sampaloc Covered Court', 'Barangay Sampaloc I, Dasmarinas', '0918-222-3344', 14.3143, 120.9325);

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
  ('c0101010-0101-0101-0101-010101010101', '10101010-1010-1010-1010-101010101010', 60, '{"go_bag","evac_plan","alerts"}', now() - interval '2 hours');

insert into public.advisories (id, title, message, severity, source, is_active, created_at)
values
  ('c1111111-1111-1111-1111-111111111111', 'Moderate Rain Advisory', 'Expect moderate rain this afternoon. Residents near rivers and low-lying areas should monitor water levels and prepare for possible evacuation.', 'medium', 'CDRRMO Dasmarinas', true, now() - interval '2 hours'),
  ('c2222222-2222-2222-2222-222222222222', 'Flood Preparedness Reminder', 'Prepare go-bags, charge mobile devices, and keep emergency numbers available at all times.', 'low', 'CDRRMO Dasmarinas', true, now() - interval '90 minutes'),
  ('c3333333-3333-3333-3333-333333333333', 'Landslide Watch', 'Communities near slopes should stay alert for soil movement and cracks, especially during heavy rainfall.', 'high', 'CDRRMO Dasmarinas', true, now() - interval '45 minutes'),
  ('c4444444-4444-4444-4444-444444444444', 'Evacuation Center Standby', 'Selected evacuation centers are on standby for immediate activation if weather conditions worsen.', 'medium', 'CDRRMO Dasmarinas', true, now() - interval '30 minutes'),
  ('c5555555-5555-5555-5555-555555555555', 'Hotline Verification Notice', 'Use only official CDRRMO hotlines and verified LGU advisories for emergency response and updates.', 'low', 'CDRRMO Dasmarinas', true, now() - interval '10 minutes');
