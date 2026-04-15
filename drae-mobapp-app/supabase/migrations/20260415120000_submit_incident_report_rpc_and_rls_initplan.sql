-- 1) Mobile submits via RPC: resolves profiles.id from auth (user_id or JWT email match)
--    so queued rows with wrong profile_id still insert; bypasses fragile client UUIDs.
-- 2) RLS: use (select auth.uid()) / (select auth.jwt()) in policies (Supabase auth_rls_initplan).

create or replace function public.submit_incident_report(
  p_hazard_type text,
  p_description text,
  p_location_text text default null,
  p_reporter_name text default null,
  p_reporter_contact text default null,
  p_evidence_url text default null,
  p_audio_url text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_uid uuid;
  v_jwt_email text;
  v_profile_id uuid;
  new_id uuid;
  v_staff_id uuid;
  v_staff_name text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_hazard_type is null or trim(p_hazard_type) = '' then
    raise exception 'hazard_type required';
  end if;
  if p_description is null or trim(p_description) = '' then
    raise exception 'description required';
  end if;
  if length(trim(p_description)) > 20000 then
    raise exception 'description too long';
  end if;

  v_jwt_email := lower(trim(both from coalesce(auth.jwt() ->> 'email', '')));

  select p.id into v_profile_id
  from public.profiles p
  where p.user_id = v_uid
     or (
       p.user_id is null
       and v_jwt_email <> ''
       and lower(trim(both from coalesce(p.email, ''))) = v_jwt_email
     )
  order by case when p.user_id = v_uid then 0 else 1 end
  limit 1;

  insert into public.incident_reports (
    profile_id,
    reporter_name,
    reporter_contact,
    hazard_type,
    location_text,
    description,
    evidence_url,
    audio_url,
    latitude,
    longitude,
    status
  ) values (
    v_profile_id,
    nullif(trim(both from coalesce(p_reporter_name, '')), ''),
    nullif(trim(both from coalesce(p_reporter_contact, '')), ''),
    trim(p_hazard_type),
    nullif(trim(both from coalesce(p_location_text, '')), ''),
    trim(p_description),
    nullif(trim(both from coalesce(p_evidence_url, '')), ''),
    nullif(trim(both from coalesce(p_audio_url, '')), ''),
    p_latitude,
    p_longitude,
    'submitted'
  )
  returning id, assigned_staff_id into new_id, v_staff_id;

  if v_staff_id is not null then
    select sm.full_name into v_staff_name
    from public.staff_members sm
    where sm.id = v_staff_id;
  end if;

  return jsonb_build_object(
    'id', new_id,
    'assigned_staff_name', coalesce(v_staff_name, '')
  );
end;
$$;

revoke all on function public.submit_incident_report(
  text, text, text, text, text, text, text, double precision, double precision
) from public;
grant execute on function public.submit_incident_report(
  text, text, text, text, text, text, text, double precision, double precision
) to authenticated;

-- --- profiles (auth_rls_initplan)
drop policy if exists "profiles_auth_select" on public.profiles;
drop policy if exists "profiles_auth_insert" on public.profiles;
drop policy if exists "profiles_auth_update" on public.profiles;
drop policy if exists "profiles_auth_delete" on public.profiles;

create policy "profiles_auth_select" on public.profiles
for select to authenticated using (
  public.is_app_admin()
  or user_id = (select auth.uid())
  or (
    user_id is null
    and lower(trim(both from coalesce(email, ''))) =
      lower(trim(both from coalesce((select auth.jwt()) ->> 'email', '')))
  )
);
create policy "profiles_auth_insert" on public.profiles
for insert to authenticated with check (
  public.is_app_admin()
  or (
    (select auth.uid()) is not null
    and (user_id is null or user_id = (select auth.uid()))
  )
);
create policy "profiles_auth_update" on public.profiles
for update to authenticated using (
  public.is_app_admin()
  or user_id = (select auth.uid())
  or (
    user_id is null
    and lower(trim(both from coalesce(email, ''))) =
      lower(trim(both from coalesce((select auth.jwt()) ->> 'email', '')))
  )
) with check (
  public.is_app_admin()
  or user_id = (select auth.uid())
);
create policy "profiles_auth_delete" on public.profiles
for delete to authenticated using (public.is_app_admin());

-- --- incident_reports (auth_rls_initplan)
drop policy if exists "incident_reports_auth_select" on public.incident_reports;
drop policy if exists "incident_reports_auth_insert" on public.incident_reports;

create policy "incident_reports_auth_select" on public.incident_reports
for select to authenticated using (
  public.is_app_admin()
  or profile_id in (
    select p.id
    from public.profiles p
    where p.user_id = (select auth.uid())
      or (
        p.user_id is null
        and lower(trim(both from coalesce(p.email, ''))) =
          lower(trim(both from coalesce((select auth.jwt()) ->> 'email', '')))
      )
  )
  or assigned_staff_id in (
    select sm.id
    from public.staff_members sm
    join public.profiles p on p.id = sm.profile_id
    where p.user_id = (select auth.uid())
  )
);
create policy "incident_reports_auth_insert" on public.incident_reports
for insert to authenticated with check (
  (select auth.uid()) is not null
  and (
    profile_id is null
    or profile_id in (
      select p.id
      from public.profiles p
      where p.user_id = (select auth.uid())
        or (
          p.user_id is null
          and lower(trim(both from coalesce(p.email, ''))) =
            lower(trim(both from coalesce((select auth.jwt()) ->> 'email', '')))
        )
    )
  )
);

-- --- household_readiness (auth_rls_initplan)
drop policy if exists "household_readiness_auth_select" on public.household_readiness;
drop policy if exists "household_readiness_auth_insert" on public.household_readiness;
drop policy if exists "household_readiness_auth_update" on public.household_readiness;
drop policy if exists "household_readiness_auth_delete" on public.household_readiness;

create policy "household_readiness_auth_select" on public.household_readiness
for select to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = (select auth.uid()))
);
create policy "household_readiness_auth_insert" on public.household_readiness
for insert to authenticated with check (
  public.is_app_admin()
  or profile_id is null
  or profile_id in (select id from public.profiles where user_id = (select auth.uid()))
);
create policy "household_readiness_auth_update" on public.household_readiness
for update to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = (select auth.uid()))
) with check (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = (select auth.uid()))
);
create policy "household_readiness_auth_delete" on public.household_readiness
for delete to authenticated using (
  public.is_app_admin()
  or profile_id in (select id from public.profiles where user_id = (select auth.uid()))
);

-- --- app_admins (auth_rls_initplan)
drop policy if exists "app_admins_select" on public.app_admins;

create policy "app_admins_select" on public.app_admins
for select to authenticated using (
  user_id = (select auth.uid())
  or public.is_superadmin()
);
