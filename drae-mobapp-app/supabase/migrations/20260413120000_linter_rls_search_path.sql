-- Supabase database linter:
-- 0011_function_search_path_mutable — lock search_path on trigger function
-- 0024_permissive_rls_policy — avoid FOR ALL + USING (true) WITH CHECK (true)
--
-- Auth: "Leaked password protection" is toggled in Dashboard → Authentication →
-- Attack Protection (HaveIBeenPwned). Not configurable via SQL.

drop trigger if exists trg_auto_assign_incident on public.incident_reports;

create or replace function public.auto_assign_incident_report()
returns trigger
language plpgsql
set search_path to public
as $func$
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
$func$;

create trigger trg_auto_assign_incident
before insert on public.incident_reports
for each row
execute procedure public.auto_assign_incident_report();

-- Drop legacy permissive policies (anon + authenticated "ALL true")
drop policy if exists "profiles_open_access" on public.profiles;
drop policy if exists "profiles_authenticated_all" on public.profiles;
drop policy if exists "incident_reports_open_access" on public.incident_reports;
drop policy if exists "incident_reports_authenticated_all" on public.incident_reports;
drop policy if exists "hotlines_open_access" on public.hotlines;
drop policy if exists "hotlines_authenticated_all" on public.hotlines;
drop policy if exists "household_readiness_open_access" on public.household_readiness;
drop policy if exists "household_readiness_authenticated_all" on public.household_readiness;
drop policy if exists "advisories_open_access" on public.advisories;
drop policy if exists "advisories_authenticated_all" on public.advisories;
drop policy if exists "staff_members_open_access" on public.staff_members;
drop policy if exists "staff_members_authenticated_all" on public.staff_members;

-- --- profiles: authenticated only (no anon table access)
create policy "profiles_auth_select" on public.profiles
for select to authenticated using (true);

create policy "profiles_auth_insert" on public.profiles
for insert to authenticated with check (auth.uid() is not null);

create policy "profiles_auth_update" on public.profiles
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "profiles_auth_delete" on public.profiles
for delete to authenticated using (auth.uid() is not null);

-- --- incident_reports: public read not required; guest submit allowed with validated insert
create policy "incident_reports_anon_insert" on public.incident_reports
for insert to anon with check (
  hazard_type is not null
  and trim(description) <> ''
  and length(description) <= 20000
);

create policy "incident_reports_auth_select" on public.incident_reports
for select to authenticated using (true);

create policy "incident_reports_auth_insert" on public.incident_reports
for insert to authenticated with check (auth.uid() is not null);

create policy "incident_reports_auth_update" on public.incident_reports
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "incident_reports_auth_delete" on public.incident_reports
for delete to authenticated using (auth.uid() is not null);

-- --- hotlines: public catalog read; writes need a signed-in user
create policy "hotlines_anon_select" on public.hotlines
for select to anon using (true);

create policy "hotlines_auth_select" on public.hotlines
for select to authenticated using (true);

create policy "hotlines_auth_insert" on public.hotlines
for insert to authenticated with check (auth.uid() is not null);

create policy "hotlines_auth_update" on public.hotlines
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "hotlines_auth_delete" on public.hotlines
for delete to authenticated using (auth.uid() is not null);

-- --- advisories
create policy "advisories_anon_select" on public.advisories
for select to anon using (true);

create policy "advisories_auth_select" on public.advisories
for select to authenticated using (true);

create policy "advisories_auth_insert" on public.advisories
for insert to authenticated with check (auth.uid() is not null);

create policy "advisories_auth_update" on public.advisories
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "advisories_auth_delete" on public.advisories
for delete to authenticated using (auth.uid() is not null);

-- --- staff_members (assignment metadata; readable to build incident response context)
create policy "staff_members_anon_select" on public.staff_members
for select to anon using (true);

create policy "staff_members_auth_select" on public.staff_members
for select to authenticated using (true);

create policy "staff_members_auth_insert" on public.staff_members
for insert to authenticated with check (auth.uid() is not null);

create policy "staff_members_auth_update" on public.staff_members
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "staff_members_auth_delete" on public.staff_members
for delete to authenticated using (auth.uid() is not null);

-- --- household_readiness: rows scoped to the caller's linked profile
create policy "household_readiness_auth_select" on public.household_readiness
for select to authenticated using (
  profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "household_readiness_auth_insert" on public.household_readiness
for insert to authenticated with check (
  profile_id is null
  or profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "household_readiness_auth_update" on public.household_readiness
for update to authenticated using (
  profile_id in (select id from public.profiles where user_id = auth.uid())
) with check (
  profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "household_readiness_auth_delete" on public.household_readiness
for delete to authenticated using (
  profile_id in (select id from public.profiles where user_id = auth.uid())
);
