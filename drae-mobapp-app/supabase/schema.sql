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

alter table public.profiles
  add column if not exists must_complete_profile boolean not null default false;

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

create table if not exists public.hotline_poster_config (
  id smallint primary key default 1,
  constraint hotline_poster_config_singleton check (id = 1),
  config jsonb not null,
  updated_at timestamptz not null default now()
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

-- Dashboard operators (CDRRMO): superadmin manages this table; admin has full ops except adding admins.
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('superadmin', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.app_admins
  add column if not exists must_change_password boolean not null default false;

create or replace function public.app_admin_clear_must_change_password()
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.app_admins
  set must_change_password = false
  where user_id = auth.uid();
end;
$$;

revoke all on function public.app_admin_clear_must_change_password() from public;
grant execute on function public.app_admin_clear_must_change_password() to authenticated;

alter table public.incident_reports
  add column if not exists assigned_staff_id uuid references public.staff_members(id) on delete set null;

alter table public.incident_reports
  add column if not exists latitude double precision;

alter table public.incident_reports
  add column if not exists longitude double precision;

drop trigger if exists trg_auto_assign_incident on public.incident_reports;
drop trigger if exists trg_enforce_staff_one_open on public.incident_reports;
drop trigger if exists trg_dispatch_next_queued_report on public.incident_reports;
drop function if exists public.auto_assign_incident_report();
drop function if exists public.enforce_staff_one_open();
drop function if exists public.dispatch_next_queued_report();

create or replace function public.auto_assign_incident_report()
returns trigger
language plpgsql
set search_path to public
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
    and not exists (
      select 1 from public.incident_reports ir
      where ir.assigned_staff_id = sm.id
        and ir.status in ('submitted', 'in_progress')
    )
  order by sm.full_name asc
  limit 1;

  if pick is null then
    select sm.id into pick
    from public.staff_members sm
    where sm.active = true
      and not exists (
        select 1 from public.incident_reports ir
        where ir.assigned_staff_id = sm.id
          and ir.status in ('submitted', 'in_progress')
      )
    order by sm.full_name asc
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

create or replace function public.enforce_staff_one_open()
returns trigger
language plpgsql
set search_path to public
as $$
begin
  if new.assigned_staff_id is null then
    return new;
  end if;
  if new.status not in ('submitted', 'in_progress') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.assigned_staff_id is not distinct from old.assigned_staff_id
     and coalesce(new.status, '') = coalesce(old.status, '') then
    return new;
  end if;

  if exists (
    select 1 from public.incident_reports ir
    where ir.assigned_staff_id = new.assigned_staff_id
      and ir.status in ('submitted', 'in_progress')
      and ir.id <> new.id
  ) then
    raise exception 'Staff already has an open assignment. Resolve or unassign first.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger trg_enforce_staff_one_open
before insert or update on public.incident_reports
for each row
execute procedure public.enforce_staff_one_open();

create or replace function public.dispatch_next_queued_report()
returns trigger
language plpgsql
set search_path to public
as $$
declare
  freed_staff uuid;
  next_report uuid;
begin
  freed_staff := null;

  if tg_op = 'UPDATE'
     and new.assigned_staff_id is not null
     and coalesce(old.status, '') <> 'resolved'
     and new.status = 'resolved' then
    freed_staff := new.assigned_staff_id;
  end if;

  if tg_op = 'UPDATE'
     and old.assigned_staff_id is not null
     and new.assigned_staff_id is null
     and coalesce(new.status, '') <> 'resolved' then
    freed_staff := old.assigned_staff_id;
  end if;

  if freed_staff is null then
    return new;
  end if;

  if exists (
    select 1 from public.incident_reports ir
    where ir.assigned_staff_id = freed_staff
      and ir.status in ('submitted', 'in_progress')
  ) then
    return new;
  end if;

  select ir.id into next_report
  from public.incident_reports ir
  join public.staff_members sm on sm.id = freed_staff
  where ir.assigned_staff_id is null
    and ir.status = 'submitted'
    and (cardinality(sm.hazard_types) = 0 or coalesce(ir.hazard_type, '') = any (sm.hazard_types))
  order by ir.created_at asc
  limit 1;

  if next_report is null then
    select ir.id into next_report
    from public.incident_reports ir
    where ir.assigned_staff_id is null
      and ir.status = 'submitted'
    order by ir.created_at asc
    limit 1;
  end if;

  if next_report is not null then
    update public.incident_reports
    set assigned_staff_id = freed_staff
    where id = next_report
      and assigned_staff_id is null;
  end if;

  return new;
end;
$$;

create trigger trg_dispatch_next_queued_report
after update on public.incident_reports
for each row
execute procedure public.dispatch_next_queued_report();

create or replace function public.staff_start_assignment(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_staff_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select sm.id into v_staff_id
  from public.staff_members sm
  join public.profiles p on p.id = sm.profile_id
  where p.user_id = auth.uid()
    and sm.active = true;

  if v_staff_id is null then
    raise exception 'You are not linked to an active staff record';
  end if;

  update public.incident_reports
  set status = 'in_progress'
  where id = p_report_id
    and assigned_staff_id = v_staff_id
    and status = 'submitted';

  if not found then
    raise exception 'Cannot start: report not assigned to you or already started';
  end if;
end;
$$;

revoke all on function public.staff_start_assignment(uuid) from public;
grant execute on function public.staff_start_assignment(uuid) to authenticated;

create or replace function public.staff_resolve_assignment(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  v_staff_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select sm.id into v_staff_id
  from public.staff_members sm
  join public.profiles p on p.id = sm.profile_id
  where p.user_id = auth.uid()
    and sm.active = true;

  if v_staff_id is null then
    raise exception 'You are not linked to an active staff record';
  end if;

  update public.incident_reports
  set status = 'resolved'
  where id = p_report_id
    and assigned_staff_id = v_staff_id
    and status in ('submitted', 'in_progress');

  if not found then
    raise exception 'Cannot resolve: report not assigned to you or already resolved';
  end if;
end;
$$;

revoke all on function public.staff_resolve_assignment(uuid) from public;
grant execute on function public.staff_resolve_assignment(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'evacuation_centers_name_unique'
  ) then
    alter table public.evacuation_centers
      add constraint evacuation_centers_name_unique unique (name);
  end if;
end $$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = auth.uid() and a.role = 'superadmin'
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

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

-- Mobile app: insert incident with server-resolved profile_id (avoids RLS 42501 from wrong client UUIDs).
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

alter table public.profiles enable row level security;
alter table public.incident_reports enable row level security;
alter table public.hotlines enable row level security;
alter table public.hotline_poster_config enable row level security;
alter table public.evacuation_centers enable row level security;
alter table public.household_readiness enable row level security;
alter table public.advisories enable row level security;
alter table public.staff_members enable row level security;
alter table public.app_admins enable row level security;

-- RLS: residents scoped to their profile; CDRRMO operators in public.app_admins see/manage all.
-- Bootstrap (SQL Editor): insert into public.app_admins (user_id, role) values ('<uuid>', 'superadmin');
grant select, insert, update, delete on table public.app_admins to authenticated;

drop policy if exists "app_admins_select" on public.app_admins;
drop policy if exists "app_admins_admin_insert" on public.app_admins;
drop policy if exists "app_admins_admin_delete" on public.app_admins;
drop policy if exists "app_admins_super_insert" on public.app_admins;
drop policy if exists "app_admins_super_update" on public.app_admins;
drop policy if exists "app_admins_super_delete" on public.app_admins;

create policy "app_admins_select" on public.app_admins
for select to authenticated using (
  user_id = (select auth.uid())
  or public.is_superadmin()
);

create policy "app_admins_super_insert" on public.app_admins
for insert to authenticated with check (public.is_superadmin());

create policy "app_admins_super_update" on public.app_admins
for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

create policy "app_admins_super_delete" on public.app_admins
for delete to authenticated using (public.is_superadmin());

create or replace function public.app_admins_guard_last_superadmin()
returns trigger
language plpgsql
set search_path to public
as $$
declare
  others int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'superadmin' then
      select count(*) into others
      from public.app_admins
      where role = 'superadmin' and user_id <> old.user_id;
      if others < 1 then
        raise exception 'Cannot remove the last superadmin.';
      end if;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.role = 'superadmin' and new.role = 'admin' then
      select count(*) into others
      from public.app_admins
      where role = 'superadmin' and user_id <> old.user_id;
      if others < 1 then
        raise exception 'Cannot demote the last superadmin.';
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_app_admins_guard_super on public.app_admins;
create trigger trg_app_admins_guard_super
before update or delete on public.app_admins
for each row
execute procedure public.app_admins_guard_last_superadmin();

create or replace function public.superadmin_list_app_admins()
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path to public
as $$
  select a.user_id, u.email::text, a.role, a.created_at
  from public.app_admins a
  join auth.users u on u.id = a.user_id
  where public.is_superadmin();
$$;

revoke all on function public.superadmin_list_app_admins() from public;
grant execute on function public.superadmin_list_app_admins() to authenticated;

drop function if exists public.superadmin_add_admin_by_email(text, text);

create or replace function public.superadmin_add_admin_by_email(
  p_email text,
  p_role text default 'admin',
  p_must_change_password boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to public
as $$
declare
  uid uuid;
  norm text;
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_role is null or p_role not in ('superadmin', 'admin') then
    raise exception 'Invalid role';
  end if;

  norm := lower(trim(both from p_email));

  select au.id into uid
  from auth.users au
  where lower(trim(both from coalesce(au.email::text, ''))) = norm
     or lower(trim(both from coalesce(au.raw_user_meta_data->>'email', ''))) = norm;

  if uid is null then
    raise exception
      using message = 'No Auth user with that email. In Supabase: Authentication → Users → Invite or Add user, then try again.';
  end if;

  perform set_config('row_security', 'off', true);
  insert into public.app_admins (user_id, role, must_change_password)
  values (uid, p_role, p_must_change_password)
  on conflict (user_id) do update set
    role = excluded.role,
    must_change_password = case
      when p_must_change_password then true
      else public.app_admins.must_change_password
    end;
  return uid;
end;
$$;

revoke all on function public.superadmin_add_admin_by_email(text, text, boolean) from public;
grant execute on function public.superadmin_add_admin_by_email(text, text, boolean) to authenticated;

create or replace function public.superadmin_remove_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own dashboard access.';
  end if;
  perform set_config('row_security', 'off', true);
  delete from public.app_admins where user_id = p_user_id;
end;
$$;

revoke all on function public.superadmin_remove_admin(uuid) from public;
grant execute on function public.superadmin_remove_admin(uuid) to authenticated;

create or replace function public.check_mobile_signup_eligible(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(p_email, '')))
      and p.user_id is null
  );
$$;

comment on function public.check_mobile_signup_eligible(text) is
  'Returns true if profiles has this email and no user_id yet (eligible for mobile sign-up link).';

revoke all on function public.check_mobile_signup_eligible(text) from public;
grant execute on function public.check_mobile_signup_eligible(text) to anon, authenticated;

drop policy if exists "profiles_open_access" on public.profiles;
drop policy if exists "profiles_authenticated_all" on public.profiles;
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

drop policy if exists "incident_reports_open_access" on public.incident_reports;
drop policy if exists "incident_reports_authenticated_all" on public.incident_reports;
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
create policy "incident_reports_auth_update" on public.incident_reports
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "incident_reports_auth_delete" on public.incident_reports
for delete to authenticated using (public.is_app_admin());

drop policy if exists "hotlines_read_access" on public.hotlines;
drop policy if exists "hotlines_open_access" on public.hotlines;
drop policy if exists "hotlines_authenticated_all" on public.hotlines;
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

drop policy if exists "hotline_poster_config_anon_select" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_auth_select" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_admin_insert" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_admin_update" on public.hotline_poster_config;
drop policy if exists "hotline_poster_config_admin_delete" on public.hotline_poster_config;
create policy "hotline_poster_config_anon_select" on public.hotline_poster_config
for select to anon using (true);
create policy "hotline_poster_config_auth_select" on public.hotline_poster_config
for select to authenticated using (true);
create policy "hotline_poster_config_admin_insert" on public.hotline_poster_config
for insert to authenticated with check (public.is_app_admin());
create policy "hotline_poster_config_admin_update" on public.hotline_poster_config
for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "hotline_poster_config_admin_delete" on public.hotline_poster_config
for delete to authenticated using (public.is_app_admin());

drop policy if exists "evacuation_centers_read_access" on public.evacuation_centers;
drop policy if exists "evacuation_centers_authenticated_select" on public.evacuation_centers;
create policy "evacuation_centers_read_access" on public.evacuation_centers
for select to anon using (true);
create policy "evacuation_centers_authenticated_select" on public.evacuation_centers
for select to authenticated using (true);

drop policy if exists "household_readiness_open_access" on public.household_readiness;
drop policy if exists "household_readiness_authenticated_all" on public.household_readiness;
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

drop policy if exists "advisories_open_access" on public.advisories;
drop policy if exists "advisories_authenticated_all" on public.advisories;
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

drop policy if exists "staff_members_open_access" on public.staff_members;
drop policy if exists "staff_members_authenticated_all" on public.staff_members;
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

-- Storage: incident-evidence (report photos/audio). Bucket + policies for mobile uploads.
insert into storage.buckets (id, name, public)
values ('incident-evidence', 'incident-evidence', true)
on conflict (id) do update set public = true;

drop policy if exists "incident_evidence_select" on storage.objects;
drop policy if exists "incident_evidence_insert_authenticated" on storage.objects;
drop policy if exists "incident_evidence_insert_anon" on storage.objects;

create policy "incident_evidence_select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'incident-evidence');

create policy "incident_evidence_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'incident-evidence');

create policy "incident_evidence_insert_anon"
on storage.objects for insert
to anon
with check (bucket_id = 'incident-evidence');

-- PostgREST uses anon / authenticated; without GRANTs, queries return 42501 even with RLS policies.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.incident_reports to anon, authenticated;
grant select, insert, update, delete on table public.hotlines to anon, authenticated;
grant select, insert, update, delete on table public.hotline_poster_config to anon, authenticated;
grant select, insert, update, delete on table public.evacuation_centers to anon, authenticated;
grant select, insert, update, delete on table public.household_readiness to anon, authenticated;
grant select, insert, update, delete on table public.advisories to anon, authenticated;
grant select, insert, update, delete on table public.staff_members to anon, authenticated;
-- app_admins: select granted above with RLS; first row must be inserted via Dashboard SQL (service role bypasses RLS).

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

insert into public.hotlines (id, label, phone, priority)
values
  ('c1111111-1111-1111-1111-111111111111', 'CDRRMO', '0464810555', 1),
  ('c2222222-2222-2222-2222-222222222222', 'Police (PNP)', '0464160254', 2),
  ('c3333333-3333-3333-3333-333333333333', 'Fire (BFP)', '0464160254', 3),
  ('c4444444-4444-4444-4444-444444444444', 'Ambulance', '09985665555', 4),
  ('c5555555-5555-5555-5555-555555555555', 'Rescue 300 Base Radio', '0464814400', 5)
on conflict (id) do update set
  label = excluded.label,
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
