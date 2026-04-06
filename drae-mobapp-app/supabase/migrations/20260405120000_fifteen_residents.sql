-- Adds 10 demo resident profiles + household_readiness rows (15 total with existing 5).
-- Safe to re-run: uses ON CONFLICT on primary keys.

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

insert into public.household_readiness (id, profile_id, score, checked_items, updated_at)
values
  ('b6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 90, array['go_bag','hotlines','evac_plan','first_aid','alerts','documents']::text[], now() - interval '5 hours'),
  ('b7777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', 72, array['go_bag','hotlines','alerts']::text[], now() - interval '4 hours'),
  ('b8888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', 55, array['go_bag','evac_plan']::text[], now() - interval '3 hours'),
  ('b9999999-9999-9999-9999-999999999999', '99999999-9999-9999-9999-999999999999', 40, array['hotlines','documents']::text[], now() - interval '2 hours'),
  ('baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 28, array['alerts']::text[], now() - interval '90 minutes'),
  ('dbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 65, array['go_bag','first_aid','evac_plan','alerts']::text[], now() - interval '6 hours'),
  ('bccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 48, array['go_bag','hotlines']::text[], now() - interval '3 hours'),
  ('bddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 77, array['go_bag','hotlines','evac_plan','documents','alerts']::text[], now() - interval '1 hour'),
  ('beeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 22, array['hotlines']::text[], now() - interval '30 minutes'),
  ('c0101010-0101-0101-0101-010101010101', '10101010-1010-1010-1010-101010101010', 60, array['go_bag','evac_plan','alerts']::text[], now() - interval '2 hours')
on conflict (id) do update set
  profile_id = excluded.profile_id,
  score = excluded.score,
  checked_items = excluded.checked_items,
  updated_at = excluded.updated_at;
