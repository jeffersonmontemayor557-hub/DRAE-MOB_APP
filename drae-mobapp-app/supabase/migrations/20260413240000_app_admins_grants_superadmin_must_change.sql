-- Authenticated clients need table privileges for RLS-backed updates (e.g. role changes in the UI).
-- Previously only SELECT was granted, so PATCH app_admins failed with "permission denied".

grant insert, update, delete on table public.app_admins to authenticated;

-- superadmin_add_admin_by_email: optional flag sets must_change_password inside SECURITY DEFINER
-- (avoids a separate client PATCH that was failing without UPDATE grant).

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
