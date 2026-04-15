-- Allow residents to insert/select incident_reports for their profile row when
-- profiles.user_id is still null but email matches JWT (same idea as profiles_auth_update).

drop policy if exists "incident_reports_auth_select" on public.incident_reports;
drop policy if exists "incident_reports_auth_insert" on public.incident_reports;

create policy "incident_reports_auth_select" on public.incident_reports
for select to authenticated using (
  public.is_app_admin()
  or profile_id in (
    select p.id
    from public.profiles p
    where p.user_id = auth.uid()
      or (
        p.user_id is null
        and lower(trim(both from coalesce(p.email, ''))) =
          lower(trim(both from coalesce(auth.jwt() ->> 'email', '')))
      )
  )
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
    or profile_id in (
      select p.id
      from public.profiles p
      where p.user_id = auth.uid()
        or (
          p.user_id is null
          and lower(trim(both from coalesce(p.email, ''))) =
            lower(trim(both from coalesce(auth.jwt() ->> 'email', '')))
        )
    )
  )
);
