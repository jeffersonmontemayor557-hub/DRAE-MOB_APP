-- Run AFTER:
-- 1) Applying migrations (including profiles.user_id).
-- 2) Creating users in Supabase Dashboard → Authentication → Users (or Auth API).
-- 3) Seeding profiles (e.g. dummy_data.sql).
--
-- This ties each login to an existing demo profile row.

update public.profiles p
set user_id = u.id
from auth.users u
where u.email = 'resident@drae.demo'
  and p.id = '22222222-2222-2222-2222-222222222222';

update public.profiles p
set user_id = u.id
from auth.users u
where u.email = 'staff@drae.demo'
  and p.id = '11111111-1111-1111-1111-111111111111';
