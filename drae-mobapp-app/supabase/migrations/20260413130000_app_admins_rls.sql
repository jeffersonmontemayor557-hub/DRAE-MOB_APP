-- CDRRMO / dashboard users listed in public.app_admins (auth.users.id).
-- Bootstrap: in SQL Editor run (once), with service role or as postgres:
--   insert into public.app_admins (user_id) values ('<your-auth-user-uuid>');
-- Admins may add more admins from SQL or a future UI; residents use the mobile app only.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

grant select on table public.app_admins to authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "app_admins_select" on public.app_admins;
drop policy if exists "app_admins_admin_insert" on public.app_admins;
drop policy if exists "app_admins_admin_delete" on public.app_admins;

create policy "app_admins_select" on public.app_admins
for select to authenticated using (
  user_id = auth.uid()
  or public.is_app_admin()
);

create policy "app_admins_admin_insert" on public.app_admins
for insert to authenticated with check (public.is_app_admin());

create policy "app_admins_admin_delete" on public.app_admins
for delete to authenticated using (public.is_app_admin());

-- Replace prior RLS policies with admin-aware rules
drop policy if exists "profiles_auth_select" on public.profiles;
drop policy if exists "profiles_auth_insert" on public.profiles;
drop policy if exists "profiles_auth_update" on public.profiles;
drop policy if exists "profiles_auth_delete" on public.profiles;

create policy "profiles_auth_select" on public.profiles
for select to authenticated using (
  public.is_app_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and lower(trim(both from coalesce(email, ''))) = lower(trim(both from coalesce(auth.jwt() ->> 'email', '')))
  )
);

create policy "profiles_auth_insert" on public.profiles
for insert to authenticated with check (
  public.is_app_admin()
  or (
    auth.uid() is not null
    and (user_id is null or user_id = auth.uid())
  )
);

create policy "profiles_auth_update" on public.profiles
for update to authenticated using (
  public.is_app_admin()
  or user_id = auth.uid()
  or (
    user_id is null
    and lower(trim(both from coalesce(email, ''))) = lower(trim(both from coalesce(auth.jwt() ->> 'email', '')))
  )
) with check (
  public.is_app_admin()
  or user_id = auth.uid()
);

create policy "profiles_auth_delete" on public.profiles
for delete to authenticated using (public.is_app_admin());

drop policy if exists "incident_reports_anon_insert" on public.incident_reports;
drop policy if exists "incident_reports_auth_select" on public.incident_reports;
drop policy if exists "incident_reports_auth_insert" on public.incident_reports;
drop policy if exists "incident_reports_auth_update" on public.incident_reports;
drop policy if exists "incident_reports_auth_delete" on public.incident_reports;

create policy "incident_reports_anon_insert" on public.incident_reports
for insert to anon with check (
  hazard_type is not null
  and trim(description) <> ''
  and length(description) <= 20000
);

create policy "incident_reports_auth_select" on public.incident_reports
for select to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = auth.uid())
  or assigned_staff_id in (
    select sm.id
    from public.staff_members sm
    join public.profiles p on p.id = sm.profile_id
    where p.user_id = auth.uid()
  )
);

create policy "incident_reports_auth_insert" on public.incident_reports
for insert to authenticated with check (
  auth.uid() is not null
  and (
    profile_id is null
    or profile_id in (select id from public.profiles where user_id = auth.uid())
  )
);

-- Only admins change assignment/status; residents and field staff use read access.
create policy "incident_reports_auth_update" on public.incident_reports
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "incident_reports_auth_delete" on public.incident_reports
for delete to authenticated using (public.is_app_admin());

drop policy if exists "hotlines_anon_select" on public.hotlines;
drop policy if exists "hotlines_auth_select" on public.hotlines;
drop policy if exists "hotlines_auth_insert" on public.hotlines;
drop policy if exists "hotlines_auth_update" on public.hotlines;
drop policy if exists "hotlines_auth_delete" on public.hotlines;

create policy "hotlines_anon_select" on public.hotlines
for select to anon using (true);

create policy "hotlines_auth_select" on public.hotlines
for select to authenticated using (true);

create policy "hotlines_auth_insert" on public.hotlines
for insert to authenticated with check (public.is_app_admin());

create policy "hotlines_auth_update" on public.hotlines
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "hotlines_auth_delete" on public.hotlines
for delete to authenticated using (public.is_app_admin());

drop policy if exists "advisories_anon_select" on public.advisories;
drop policy if exists "advisories_auth_select" on public.advisories;
drop policy if exists "advisories_auth_insert" on public.advisories;
drop policy if exists "advisories_auth_update" on public.advisories;
drop policy if exists "advisories_auth_delete" on public.advisories;

create policy "advisories_anon_select" on public.advisories
for select to anon using (true);

create policy "advisories_auth_select" on public.advisories
for select to authenticated using (true);

create policy "advisories_auth_insert" on public.advisories
for insert to authenticated with check (public.is_app_admin());

create policy "advisories_auth_update" on public.advisories
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "advisories_auth_delete" on public.advisories
for delete to authenticated using (public.is_app_admin());

drop policy if exists "staff_members_anon_select" on public.staff_members;
drop policy if exists "staff_members_auth_select" on public.staff_members;
drop policy if exists "staff_members_auth_insert" on public.staff_members;
drop policy if exists "staff_members_auth_update" on public.staff_members;
drop policy if exists "staff_members_auth_delete" on public.staff_members;

create policy "staff_members_anon_select" on public.staff_members
for select to anon using (true);

create policy "staff_members_auth_select" on public.staff_members
for select to authenticated using (true);

create policy "staff_members_auth_insert" on public.staff_members
for insert to authenticated with check (public.is_app_admin());

create policy "staff_members_auth_update" on public.staff_members
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "staff_members_auth_delete" on public.staff_members
for delete to authenticated using (public.is_app_admin());

drop policy if exists "household_readiness_auth_select" on public.household_readiness;
drop policy if exists "household_readiness_auth_insert" on public.household_readiness;
drop policy if exists "household_readiness_auth_update" on public.household_readiness;
drop policy if exists "household_readiness_auth_delete" on public.household_readiness;

create policy "household_readiness_auth_select" on public.household_readiness
for select to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "household_readiness_auth_insert" on public.household_readiness
for insert to authenticated with check (
  public.is_app_admin()
  or profile_id is null
  or profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "household_readiness_auth_update" on public.household_readiness
for update to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = auth.uid())
) with check (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "household_readiness_auth_delete" on public.household_readiness
for delete to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = auth.uid())
);
