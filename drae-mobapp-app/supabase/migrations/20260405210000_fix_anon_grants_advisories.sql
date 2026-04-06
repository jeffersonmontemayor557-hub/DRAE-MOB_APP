-- Fixes: ERROR 42501 permission denied for table advisories (and similar on other tables)
-- when tables were created in the Dashboard without default GRANTs for anon/authenticated.
-- Run once in Supabase SQL Editor (as postgres).

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.advisories to anon, authenticated;
grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.incident_reports to anon, authenticated;
grant select, insert, update, delete on table public.hotlines to anon, authenticated;
grant select, insert, update, delete on table public.evacuation_centers to anon, authenticated;
grant select, insert, update, delete on table public.household_readiness to anon, authenticated;
grant select, insert, update, delete on table public.staff_members to anon, authenticated;

-- RLS: ensure policy allows anon (and authenticated) — single policy for both roles
alter table public.advisories enable row level security;

drop policy if exists "advisories_open_access" on public.advisories;
create policy "advisories_open_access" on public.advisories
for all
to anon, authenticated
using (true)
with check (true);
