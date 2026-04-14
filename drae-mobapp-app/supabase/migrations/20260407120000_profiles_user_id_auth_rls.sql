-- Link public.profiles to Supabase Auth; allow JWT-authenticated API calls (RLS).

alter table public.profiles
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists profiles_user_id_unique
  on public.profiles (user_id)
  where user_id is not null;

-- Mirror prototype "open" anon policies for authenticated sessions (dev / demo).
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
